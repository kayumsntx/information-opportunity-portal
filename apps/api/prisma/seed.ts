import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  SystemRole,
  SYSTEM_PERMISSIONS,
  ROLE_PERMISSIONS_MAP,
} from '../src/auth/constants/rbac.constants.js';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/information_portal';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedRbac(client: PrismaClient = prisma) {
  console.log('🌱 Starting RBAC seed process...');

  // 1. Seed Roles (Idempotent upsert)
  const roleDescriptions: Record<SystemRole, string> = {
    [SystemRole.SUPER_ADMIN]: 'Super Administrator with full platform access',
    [SystemRole.CATEGORY_AUTHOR]: 'Category Author with content management permissions',
    [SystemRole.REGISTERED_USER]: 'Standard registered user',
  };

  const roles: Record<string, string> = {};
  for (const roleName of Object.values(SystemRole)) {
    const role = await client.role.upsert({
      where: { name: roleName },
      update: {
        description: roleDescriptions[roleName],
        isSystem: true,
      },
      create: {
        name: roleName,
        description: roleDescriptions[roleName],
        isSystem: true,
      },
    });
    roles[roleName] = role.id;
  }
  console.log(`✅ Seeded ${Object.keys(roles).length} system roles.`);

  // 2. Seed Permissions (Idempotent upsert)
  const permissions: Record<string, string> = {};
  for (const perm of SYSTEM_PERMISSIONS) {
    const permission = await client.permission.upsert({
      where: { name: perm.name },
      update: {
        description: perm.description,
        module: perm.module,
      },
      create: {
        name: perm.name,
        description: perm.description,
        module: perm.module,
      },
    });
    permissions[perm.name] = permission.id;
  }
  console.log(`✅ Seeded ${Object.keys(permissions).length} system permissions.`);

  // 3. Assign Permissions to Roles (Idempotent upsert)
  let assignedCount = 0;
  for (const [roleName, permNames] of Object.entries(ROLE_PERMISSIONS_MAP)) {
    const roleId = roles[roleName];
    if (!roleId) continue;

    for (const permName of permNames) {
      const permissionId = permissions[permName];
      if (!permissionId) continue;

      await client.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId,
        },
      });
      assignedCount++;
    }
  }
  console.log(`✅ Seeded ${assignedCount} role-permission mappings.`);

  // 4. Secure Super Admin Bootstrap (if credentials provided via environment)
  const adminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    console.log(`🔐 Checking Super Admin bootstrap account (${adminEmail})...`);
    const superAdminRoleId = roles[SystemRole.SUPER_ADMIN];

    const existingUser = await client.user.findUnique({
      where: { email: adminEmail },
      include: { userRoles: true },
    });

    if (existingUser) {
      // Ensure user has SUPER_ADMIN role
      await client.userRole.upsert({
        where: {
          userId_roleId: {
            userId: existingUser.id,
            roleId: superAdminRoleId,
          },
        },
        update: {},
        create: {
          userId: existingUser.id,
          roleId: superAdminRoleId,
          assignedBy: 'SYSTEM_BOOTSTRAP',
        },
      });
      console.log(`✅ User '${adminEmail}' verified with SUPER_ADMIN role.`);
    } else {
      // Hash password securely with Argon2id
      const passwordHash = await argon2.hash(adminPassword, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      });

      await client.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          status: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          profile: {
            create: {
              displayName: 'Super Admin',
            },
          },
          userRoles: {
            create: {
              roleId: superAdminRoleId,
              assignedBy: 'SYSTEM_BOOTSTRAP',
            },
          },
        },
      });
      console.log(`✅ Super Admin bootstrap account successfully created.`);
    }
  } else {
    console.log('ℹ️ No SUPER_ADMIN_EMAIL/PASSWORD provided in env. Skipping Super Admin account bootstrap.');
  }

  console.log('🎉 RBAC seed completed successfully.');
}

async function main() {
  try {
    await seedRbac();
  } catch (error) {
    console.error('❌ Error during RBAC seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Execute if run directly from CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  void main();
}
