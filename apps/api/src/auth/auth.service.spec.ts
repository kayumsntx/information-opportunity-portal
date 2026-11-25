import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../database/prisma.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: any;
  let jwtService: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      role: {
        upsert: vi.fn(),
      },
      userSession: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(prisma)),
    };

    jwtService = {
      signAsync: vi.fn().mockResolvedValue('mock_access_token'),
    };

    authService = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  describe('Password Hashing with Argon2id', () => {
    it('should hash a password and verify it correctly', async () => {
      const password = 'SuperSecretPassword123!';
      const hash = await authService.hashPassword(password);

      expect(hash).toContain('$argon2id$');
      const isValid = await authService.verifyPassword(hash, password);
      expect(isValid).toBe(true);

      const isInvalid = await authService.verifyPassword(hash, 'WrongPassword');
      expect(isInvalid).toBe(false);
    });
  });

  describe('User Registration', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      phone: '+1234567890',
      firstName: 'Test',
      lastName: 'User',
      displayName: 'testuser',
    };

    it('should register a new user and assign REGISTERED_USER role', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const mockRole = { id: 'role-1', name: 'REGISTERED_USER' };
      prisma.role.upsert.mockResolvedValue(mockRole);

      const mockUser = {
        id: 'user-1',
        email: registerDto.email,
        phone: registerDto.phone,
        status: 'ACTIVE',
        emailVerified: false,
        createdAt: new Date(),
        profile: {
          id: 'profile-1',
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          displayName: registerDto.displayName,
          avatarUrl: null,
        },
        userRoles: [{ role: mockRole }],
      };
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.userSession.create.mockResolvedValue({ id: 'session-1' });

      const result = await authService.register(registerDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.user.email).toBe(registerDto.email);
      expect(result.user.roles).toContain('REGISTERED_USER');
      expect(result.tokens.accessToken).toBe('mock_access_token');
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw ConflictException on duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'existing-id', email: registerDto.email });

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException on duplicate phone', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // email not taken
        .mockResolvedValueOnce({ id: 'existing-id', phone: registerDto.phone }); // phone taken

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('User Login', () => {
    const loginDto = {
      email: 'user@example.com',
      password: 'SecurePassword123!',
    };

    it('should login successfully with correct password', async () => {
      const passwordHash = await argon2.hash(loginDto.password, { type: argon2.argon2id });
      const mockRole = { id: 'role-1', name: 'REGISTERED_USER' };
      const mockUser = {
        id: 'user-1',
        email: loginDto.email,
        passwordHash,
        status: 'ACTIVE',
        emailVerified: false,
        createdAt: new Date(),
        profile: { id: 'profile-1', displayName: 'User' },
        userRoles: [{ role: mockRole }],
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userSession.create.mockResolvedValue({ id: 'session-1' });

      const result = await authService.login(loginDto);

      expect(result.user.email).toBe(loginDto.email);
      expect(result.tokens.accessToken).toBe('mock_access_token');
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException when email does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      const passwordHash = await argon2.hash('DifferentPassword', { type: argon2.argon2id });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        passwordHash,
        status: 'ACTIVE',
      });

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject suspended user login', async () => {
      const passwordHash = await argon2.hash(loginDto.password, { type: argon2.argon2id });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        passwordHash,
        status: 'SUSPENDED',
      });

      await expect(authService.login(loginDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject banned user login', async () => {
      const passwordHash = await argon2.hash(loginDto.password, { type: argon2.argon2id });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        passwordHash,
        status: 'BANNED',
      });

      await expect(authService.login(loginDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Refresh Token Rotation & Invalidation', () => {
    it('should rotate valid refresh token, revoking previous session and issuing new tokens', async () => {
      const rawToken = 'valid_raw_refresh_token_12345';
      const tokenHash = authService.hashToken(rawToken);

      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        tokenHash,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // expires in 1 hour
        user: {
          id: 'user-1',
          email: 'user@example.com',
          status: 'ACTIVE',
          userRoles: [{ role: { name: 'REGISTERED_USER' } }],
        },
      };

      prisma.userSession.findUnique.mockResolvedValue(mockSession);
      prisma.userSession.update.mockResolvedValue({ id: 'session-1', isRevoked: true });
      prisma.userSession.create.mockResolvedValue({ id: 'session-2' });

      const result = await authService.refreshTokens(rawToken);

      expect(result.accessToken).toBe('mock_access_token');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(rawToken);
      expect(prisma.userSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: { isRevoked: true },
        }),
      );
    });

    it('should detect revoked refresh token reuse and revoke all sessions for that user', async () => {
      const rawToken = 'revoked_raw_refresh_token';
      const tokenHash = authService.hashToken(rawToken);

      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        tokenHash,
        isRevoked: true, // already revoked
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        user: { id: 'user-1', status: 'ACTIVE', userRoles: [] },
      };

      prisma.userSession.findUnique.mockResolvedValue(mockSession);

      await expect(authService.refreshTokens(rawToken)).rejects.toThrow(
        UnauthorizedException,
      );

      // Verify all active sessions were revoked
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRevoked: false },
        data: { isRevoked: true },
      });
    });

    it('should reject expired refresh token', async () => {
      const rawToken = 'expired_raw_refresh_token';
      const tokenHash = authService.hashToken(rawToken);

      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        tokenHash,
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000 * 60), // expired 1 minute ago
        user: { id: 'user-1', status: 'ACTIVE', userRoles: [] },
      };

      prisma.userSession.findUnique.mockResolvedValue(mockSession);

      await expect(authService.refreshTokens(rawToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.userSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: { isRevoked: true },
        }),
      );
    });
  });

  describe('Logout & Logout All', () => {
    it('should revoke session on logout', async () => {
      const rawToken = 'token_to_logout';
      const tokenHash = authService.hashToken(rawToken);

      await authService.logout(rawToken);

      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { tokenHash, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    it('should revoke all active sessions for a user on logoutAll', async () => {
      await authService.logoutAll('user-1');

      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });
});
