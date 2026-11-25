import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy, JwtPayload } from './jwt.strategy.js';
import { PrismaService } from '../../database/prisma.service.js';

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
      },
    };

    jwtStrategy = new JwtStrategy(prisma as unknown as PrismaService);
  });

  it('should validate and return active user profile and roles', async () => {
    const payload: JwtPayload = {
      sub: 'user-1',
      email: 'user@example.com',
      roles: ['REGISTERED_USER'],
    };

    const mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      phone: null,
      status: 'ACTIVE',
      emailVerified: true,
      createdAt: new Date(),
      profile: {
        id: 'profile-1',
        displayName: 'TestUser',
      },
      userRoles: [
        {
          role: {
            name: 'REGISTERED_USER',
            rolePermissions: [
              {
                permission: {
                  name: 'posts.read',
                },
              },
            ],
          },
        },
      ],
    };

    prisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await jwtStrategy.validate(payload);

    expect(result.id).toBe('user-1');
    expect(result.email).toBe('user@example.com');
    expect(result.roles).toEqual(['REGISTERED_USER']);
    expect(result.permissions).toEqual(['posts.read']);
  });

  it('should throw UnauthorizedException when payload has no sub', async () => {
    const invalidPayload = {} as JwtPayload;

    await expect(jwtStrategy.validate(invalidPayload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when user does not exist in DB', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const payload: JwtPayload = {
      sub: 'non-existent',
      email: 'ghost@example.com',
      roles: [],
    };

    await expect(jwtStrategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when user account is not ACTIVE', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      status: 'SUSPENDED',
      userRoles: [],
    });

    const payload: JwtPayload = {
      sub: 'user-1',
      email: 'user@example.com',
      roles: [],
    };

    await expect(jwtStrategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
