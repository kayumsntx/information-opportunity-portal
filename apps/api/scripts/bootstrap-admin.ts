import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { SystemRole } from '../src/auth/constants/rbac.constants.js';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/information_portal';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function bootstrapAdmin() {
  const email = (process.argv[2] || process.env.SUPER_ADMIN_EMAIL)?.trim().toLowerCase();
  const password = process.argv[3] || process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('❌ Usage:');
    console.error('   tsx scripts/bootstrap-admin.ts <email> <password>');
    console.error('   OR provide SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters long.');
    process.exit(1);
  }

  console.log(`🔐 Bootstrapping Super Admin for email: ${email}`);

  // 1. Ensure SUPER_ADMIN role exists
  const superAdminRole = await prisma.role.upsert({
    where: { name: SystemRole.SUPER_ADMIN },
    update: { isSystem: true },
    create: {
      name: SystemRole.SUPER_ADMIN,
      description: 'Super Administrator with full platform access',
      isSystem: true,
    },
  });

  // 2. Hash password with Argon2id
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  // 3. Upsert user
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash,
        status: 'ACTIVE',
        emailVerified: true,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: existingUser.id,
          roleId: superAdminRole.id,
        },
      },
      update: {},
      create: {
        userId: existingUser.id,
        roleId: superAdminRole.id,
        assignedBy: 'CLI_BOOTSTRAP',
      },
    });

    console.log(`✅ Existing user updated with new password and SUPER_ADMIN role.`);
  } else {
    await prisma.user.create({
      data: {
        email,
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
            roleId: superAdminRole.id,
            assignedBy: 'CLI_BOOTSTRAP',
          },
        },
      },
    });

    console.log(`✅ Super Admin user successfully created with email: ${email}`);
  }
}

async function main() {
  try {
    await bootstrapAdmin();
  } catch (error) {
    console.error('❌ Failed to bootstrap Super Admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void main();
