import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { SystemRole } from '../auth/constants/rbac.constants.js';

describe('RolesService', () => {
  let rolesService: RolesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      role: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      permission: {
        findMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      userRole: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(prisma)),
    };

    rolesService = new RolesService(prisma as unknown as PrismaService);
  });

  describe('findAllRoles', () => {
    it('should return all roles with permissions and user count', async () => {
      const mockRoles = [
        {
          id: 'role-1',
          name: 'SUPER_ADMIN',
          description: 'Super admin',
          isSystem: true,
          createdAt: new Date(),
          rolePermissions: [
            {
              permission: {
                id: 'perm-1',
                name: 'users.read',
                description: 'Read users',
                module: 'USER',
              },
            },
          ],
          _count: { userRoles: 2 },
        },
      ];

      prisma.role.findMany.mockResolvedValue(mockRoles);

      const result = await rolesService.findAllRoles();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('SUPER_ADMIN');
      expect(result[0].userCount).toBe(2);
      expect(result[0].permissions[0].name).toBe('users.read');
    });
  });

  describe('findRoleById', () => {
    it('should return role by ID', async () => {
      const mockRole = {
        id: 'role-1',
        name: 'SUPER_ADMIN',
        description: 'Super admin',
        isSystem: true,
        createdAt: new Date(),
        rolePermissions: [],
        _count: { userRoles: 1 },
      };

      prisma.role.findUnique.mockResolvedValue(mockRole);

      const result = await rolesService.findRoleById('role-1');

      expect(result.id).toBe('role-1');
      expect(result.name).toBe('SUPER_ADMIN');
    });

    it('should throw NotFoundException when role does not exist', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(rolesService.findRoleById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignRoleToUser', () => {
    it('should assign a role and create an audit log record', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
      prisma.role.findUnique.mockResolvedValue({ id: 'role-1', name: 'CATEGORY_AUTHOR' });
      prisma.userRole.findUnique.mockResolvedValue(null); // not already assigned
      prisma.userRole.create.mockResolvedValue({
        id: 'ur-1',
        userId: 'user-1',
        roleId: 'role-1',
        assignedAt: new Date(),
        role: { name: 'CATEGORY_AUTHOR' },
      });
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

      const result = await rolesService.assignRoleToUser('user-1', 'role-1', 'admin-1');

      expect(result.message).toContain('CATEGORY_AUTHOR');
      expect(prisma.userRole.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          roleId: 'role-1',
          assignedBy: 'admin-1',
        },
        include: { role: true },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ROLE_ASSIGNED',
            entityType: 'UserRole',
          }),
        }),
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        rolesService.assignRoleToUser('non-existent', 'role-1', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when role does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(
        rolesService.assignRoleToUser('user-1', 'non-existent', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user already has the role', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.role.findUnique.mockResolvedValue({ id: 'role-1', name: 'REGISTERED_USER' });
      prisma.userRole.findUnique.mockResolvedValue({ id: 'existing-ur' });

      await expect(
        rolesService.assignRoleToUser('user-1', 'role-1', 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('revokeRoleFromUser', () => {
    it('should revoke a regular role and create an audit log record', async () => {
      const mockUserRole = {
        id: 'ur-1',
        userId: 'user-1',
        roleId: 'role-author',
        role: { name: 'CATEGORY_AUTHOR' },
        user: { email: 'author@example.com' },
      };

      prisma.userRole.findUnique.mockResolvedValue(mockUserRole);
      prisma.userRole.delete.mockResolvedValue(mockUserRole);
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

      const result = await rolesService.revokeRoleFromUser('user-1', 'role-author', 'admin-1');

      expect(result.message).toContain('revoked');
      expect(prisma.userRole.delete).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ROLE_REVOKED',
          }),
        }),
      );
    });

    it('should throw NotFoundException if role assignment does not exist', async () => {
      prisma.userRole.findUnique.mockResolvedValue(null);

      await expect(
        rolesService.revokeRoleFromUser('user-1', 'role-1', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent accidental removal of the last active Super Admin', async () => {
      const mockSuperAdminAssignment = {
        id: 'ur-super',
        userId: 'super-1',
        roleId: 'role-super',
        role: { name: SystemRole.SUPER_ADMIN },
        user: { email: 'super@example.com' },
      };

      prisma.userRole.findUnique.mockResolvedValue(mockSuperAdminAssignment);
      // Only 1 active Super Admin in the system!
      prisma.userRole.count.mockResolvedValue(1);

      await expect(
        rolesService.revokeRoleFromUser('super-1', 'role-super', 'super-1'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.userRole.delete).not.toHaveBeenCalled();
    });

    it('should allow removing a Super Admin if more than 1 active Super Admin exists', async () => {
      const mockSuperAdminAssignment = {
        id: 'ur-super-2',
        userId: 'super-2',
        roleId: 'role-super',
        role: { name: SystemRole.SUPER_ADMIN },
        user: { email: 'super2@example.com' },
      };

      prisma.userRole.findUnique.mockResolvedValue(mockSuperAdminAssignment);
      // 2 active Super Admins exist
      prisma.userRole.count.mockResolvedValue(2);
      prisma.userRole.delete.mockResolvedValue(mockSuperAdminAssignment);
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

      const result = await rolesService.revokeRoleFromUser('super-2', 'role-super', 'super-1');

      expect(result.message).toContain('revoked');
      expect(prisma.userRole.delete).toHaveBeenCalled();
    });
  });
});
