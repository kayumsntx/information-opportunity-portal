import { describe, it, expect, vi } from 'vitest';
import { seedRbac } from '../../prisma/seed.js';
import { SystemRole, SYSTEM_PERMISSIONS } from '../auth/constants/rbac.constants.js';

describe('Seed and Registration RBAC Security', () => {
  it('should be idempotent and not create duplicate roles or permissions on multiple seed runs', async () => {
    const rolesMap = new Map<string, any>();
    const permissionsMap = new Map<string, any>();
    const rolePermissionsMap = new Map<string, any>();

    const mockPrismaClient: any = {
      role: {
        upsert: vi.fn(({ where, create, update }) => {
          if (rolesMap.has(where.name)) {
            const updated = { ...rolesMap.get(where.name), ...update };
            rolesMap.set(where.name, updated);
            return updated;
          }
          const created = { id: `role-${rolesMap.size + 1}`, ...create };
          rolesMap.set(where.name, created);
          return created;
        }),
      },
      permission: {
        upsert: vi.fn(({ where, create, update }) => {
          if (permissionsMap.has(where.name)) {
            const updated = { ...permissionsMap.get(where.name), ...update };
            permissionsMap.set(where.name, updated);
            return updated;
          }
          const created = { id: `perm-${permissionsMap.size + 1}`, ...create };
          permissionsMap.set(where.name, created);
          return created;
        }),
      },
      rolePermission: {
        upsert: vi.fn(({ where, create }) => {
          const key = `${where.roleId_permissionId.roleId}_${where.roleId_permissionId.permissionId}`;
          if (rolePermissionsMap.has(key)) {
            return rolePermissionsMap.get(key);
          }
          const record = { id: `rp-${rolePermissionsMap.size + 1}`, ...create };
          rolePermissionsMap.set(key, record);
          return record;
        }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      userRole: {
        upsert: vi.fn(),
      },
    };

    // Run 1: First seed
    await seedRbac(mockPrismaClient);
    const rolesCountRun1 = rolesMap.size;
    const permissionsCountRun1 = permissionsMap.size;
    const rolePermissionsCountRun1 = rolePermissionsMap.size;

    expect(rolesCountRun1).toBe(Object.values(SystemRole).length);
    expect(permissionsCountRun1).toBe(SYSTEM_PERMISSIONS.length);

    // Run 2: Re-run seed
    await seedRbac(mockPrismaClient);
    const rolesCountRun2 = rolesMap.size;
    const permissionsCountRun2 = permissionsMap.size;
    const rolePermissionsCountRun2 = rolePermissionsMap.size;

    // Verify exact same count, no duplicates!
    expect(rolesCountRun2).toBe(rolesCountRun1);
    expect(permissionsCountRun2).toBe(permissionsCountRun1);
    expect(rolePermissionsCountRun2).toBe(rolePermissionsCountRun1);
  });
});
