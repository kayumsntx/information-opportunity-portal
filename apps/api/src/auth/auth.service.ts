import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';
import { PrismaService } from '../database/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import {
  AuthResponseDto,
  TokensResponseDto,
  UserResponseDto,
} from './dto/auth-response.dto.js';

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Hashes a password using Argon2id.
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  }

  /**
   * Verifies a plain password against an Argon2 hash.
   */
  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  /**
   * Generates a SHA-256 hash for secure storage of refresh tokens.
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Registers a new user with UserProfile and REGISTERED_USER role within a database transaction.
   */
  async register(
    dto: RegisterDto,
    metadata: RequestMetadata = {},
  ): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase().trim();
    const phone = dto.phone ? dto.phone.trim() : null;

    // 1. Check duplicate email
    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('Email address is already registered');
    }

    // 2. Check duplicate phone if provided
    if (phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone },
      });
      if (existingPhone) {
        throw new ConflictException('Phone number is already registered');
      }
    }

    // 3. Hash password with Argon2id
    const passwordHash = await this.hashPassword(dto.password);

    // 4. Execute atomic transaction
    const user = await this.prisma.$transaction(async (tx) => {
      // Ensure the standard role exists
      const registeredRole = await tx.role.upsert({
        where: { name: 'REGISTERED_USER' },
        update: {},
        create: {
          name: 'REGISTERED_USER',
          description: 'Standard registered user role',
          isSystem: true,
        },
      });

      // Create User with Profile and Role
      return tx.user.create({
        data: {
          email,
          phone,
          passwordHash,
          status: 'ACTIVE',
          profile: {
            create: {
              firstName: dto.firstName?.trim() || null,
              lastName: dto.lastName?.trim() || null,
              displayName:
                dto.displayName?.trim() ||
                dto.firstName?.trim() ||
                email.split('@')[0],
            },
          },
          userRoles: {
            create: {
              roleId: registeredRole.id,
            },
          },
        },
        include: {
          profile: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
    });

    const roles = user.userRoles.map((ur) => ur.role.name);
    const tokens = await this.createSession(user.id, user.email, roles, metadata);

    return {
      user: this.formatUser(user),
      tokens,
    };
  }

  /**
   * Authenticates a user by email and password, returning tokens and profile.
   */
  async login(
    dto: LoginDto,
    metadata: RequestMetadata = {},
  ): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase().trim();

    // 1. Fetch user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    // 2. Generic error prevents user enumeration
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Verify Argon2 password
    const isPasswordValid = await this.verifyPassword(
      user.passwordHash,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 4. Check account status
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException(
        'Your account has been suspended. Please contact support.',
      );
    }
    if (user.status === 'BANNED') {
      throw new ForbiddenException('Your account has been permanently banned.');
    }
    if (user.status === 'DEACTIVATED') {
      throw new ForbiddenException(
        'Your account has been deactivated. Please contact support.',
      );
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const tokens = await this.createSession(user.id, user.email, roles, metadata);

    return {
      user: this.formatUser(user),
      tokens,
    };
  }

  /**
   * Validates a refresh token, revokes it, and issues a new access token and rotated refresh token.
   */
  async refreshTokens(
    refreshToken: string,
    metadata: RequestMetadata = {},
  ): Promise<TokensResponseDto> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = this.hashToken(refreshToken);

    // Find the session matching the hashed refresh token
    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Detect refresh token reuse / replay attacks
    if (session.isRevoked) {
      this.logger.warn(
        `Potential refresh token reuse detected for user ID: ${session.userId}`,
      );
      // Revoke all active sessions for this user for security
      await this.prisma.userSession.updateMany({
        where: { userId: session.userId, isRevoked: false },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException(
        'Refresh token has already been revoked. For security, all sessions have been logged out.',
      );
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Check user account status
    if (session.user.status !== 'ACTIVE') {
      throw new ForbiddenException('User account is not active');
    }

    const roles = session.user.userRoles.map((ur) => ur.role.name);

    // Rotate: Mark old session revoked and issue a new session with new tokens
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = this.hashToken(newRefreshToken);
    const expiresAt = this.getRefreshTokenExpiration();

    await this.prisma.$transaction(async (tx) => {
      // 1. Revoke the consumed token
      await tx.userSession.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });

      // 2. Create the new rotated session
      await tx.userSession.create({
        data: {
          userId: session.userId,
          tokenHash: newTokenHash,
          deviceInfo: metadata.deviceInfo || session.deviceInfo,
          ipAddress: metadata.ipAddress || session.ipAddress,
          userAgent: metadata.userAgent || session.userAgent,
          expiresAt,
        },
      });
    });

    const accessToken = await this.generateAccessToken(
      session.user.id,
      session.user.email,
      roles,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logs out of the current session by revoking the given refresh token.
   */
  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.userSession.updateMany({
      where: { tokenHash, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  /**
   * Logs out of all sessions for a given user.
   */
  async logoutAll(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  /**
   * Fetches user profile by ID.
   */
  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.formatUser(user);
  }

  /**
   * Helper to create a new session record and return tokens.
   */
  private async createSession(
    userId: string,
    email: string,
    roles: string[],
    metadata: RequestMetadata,
  ): Promise<TokensResponseDto> {
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = this.getRefreshTokenExpiration();

    await this.prisma.userSession.create({
      data: {
        userId,
        tokenHash,
        deviceInfo: metadata.deviceInfo || null,
        ipAddress: metadata.ipAddress || null,
        userAgent: metadata.userAgent || null,
        expiresAt,
      },
    });

    const accessToken = await this.generateAccessToken(userId, email, roles);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Generates a signed JWT access token.
   */
  private async generateAccessToken(
    userId: string,
    email: string,
    roles: string[],
  ): Promise<string> {
    const payload = {
      sub: userId,
      email,
      roles,
    };

    const secret =
      process.env.JWT_SECRET || 'information_portal_jwt_secret_key';
    const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';

    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn: expiresIn as any,
    });
  }

  /**
   * Calculates the expiration Date for a refresh token from environment or default (7 days).
   */
  private getRefreshTokenExpiration(): Date {
    const expStr = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    let days = 7;

    if (expStr.endsWith('d')) {
      const parsed = parseInt(expStr.slice(0, -1), 10);
      if (!isNaN(parsed)) days = parsed;
    } else if (expStr.endsWith('h')) {
      const hours = parseInt(expStr.slice(0, -1), 10);
      if (!isNaN(hours)) {
        return new Date(Date.now() + hours * 60 * 60 * 1000);
      }
    }

    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Formats a User database record into UserResponseDto.
   */
  private formatUser(user: any): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      status: user.status,
      emailVerified: user.emailVerified,
      roles: user.userRoles ? user.userRoles.map((ur: any) => ur.role.name) : [],
      profile: user.profile
        ? {
            id: user.profile.id,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            displayName: user.profile.displayName,
            avatarUrl: user.profile.avatarUrl,
          }
        : null,
      createdAt: user.createdAt,
    };
  }
}
