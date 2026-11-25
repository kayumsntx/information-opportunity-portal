import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { SystemRole } from '../auth/constants/rbac.constants.js';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all roles with permissions and user count.
   */
  async findAllRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        module: rp.permission.module,
      })),
      userCount: role._count.userRoles,
      createdAt: role.createdAt,
    }));
  }

  /**
   * Find a role by its ID.
   */
  async findRoleById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        module: rp.permission.module,
      })),
      userCount: role._count.userRoles,
      createdAt: role.createdAt,
    };
  }

  /**
   * List all permissions grouped by module.
   */
  async findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Assign a role to a user.
   */
  async assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy: string,
  ) {
    // 1. Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // 2. Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID '${roleId}' not found`);
    }

    // 3. Check if assignment already exists
    const existingAssignment = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
    if (existingAssignment) {
      throw new ConflictException(
        `User is already assigned to role '${role.name}'`,
      );
    }

    // 4. Assign role and record audit log in a transaction
    return this.prisma.$transaction(async (tx) => {
      const userRole = await tx.userRole.create({
        data: {
          userId,
          roleId,
          assignedBy,
        },
        include: {
          role: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: assignedBy,
          action: 'ROLE_ASSIGNED',
          entityType: 'UserRole',
          entityId: userRole.id,
          description: `Assigned role '${role.name}' to user '${user.email}'`,
          metadata: {
            targetUserId: userId,
            targetUserEmail: user.email,
            roleId,
            roleName: role.name,
            assignedBy,
          },
        },
      });

      return {
        message: `Role '${role.name}' successfully assigned to user`,
        userRole: {
          id: userRole.id,
          userId: userRole.userId,
          roleId: userRole.roleId,
          roleName: userRole.role.name,
          assignedAt: userRole.assignedAt,
        },
      };
    });
  }

  /**
   * Revoke a role from a user.
   */
  async revokeRoleFromUser(
    userId: string,
    roleId: string,
    revokedBy: string,
  ) {
    // 1. Verify assignment exists
    const userRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      include: {
        role: true,
        user: true,
      },
    });

    if (!userRole) {
      throw new NotFoundException(
        `Role assignment not found for user '${userId}' and role '${roleId}'`,
      );
    }

    // 2. Prevent accidental removal of the last active Super Admin!
    if (userRole.role.name === SystemRole.SUPER_ADMIN) {
      const activeSuperAdminsCount = await this.prisma.userRole.count({
        where: {
          role: { name: SystemRole.SUPER_ADMIN },
          user: { status: 'ACTIVE' },
        },
      });

      if (activeSuperAdminsCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last active Super Admin. At least one active Super Admin must remain on the platform.',
        );
      }
    }

    // 3. Remove role and record audit log in a transaction
    return this.prisma.$transaction(async (tx) => {
      await tx.userRole.delete({
        where: {
          userId_roleId: {
            userId,
            roleId,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: revokedBy,
          action: 'ROLE_REVOKED',
          entityType: 'UserRole',
          entityId: userRole.id,
          description: `Revoked role '${userRole.role.name}' from user '${userRole.user.email}'`,
          metadata: {
            targetUserId: userId,
            targetUserEmail: userRole.user.email,
            roleId,
            roleName: userRole.role.name,
            revokedBy,
          },
        },
      });

      return {
        message: `Role '${userRole.role.name}' successfully revoked from user`,
      };
    });
  }
}
