import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const { Pool } = pg;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: pg.Pool;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/information_portal';

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to PostgreSQL database.');
    } catch (error) {
      this.logger.warn(
        `Could not connect to PostgreSQL database on startup. Ensure PostgreSQL is running and DATABASE_URL is configured: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
    } catch (error) {
      this.logger.error('Error disconnecting Prisma client:', error);
    }

    try {
      await this.pool.end();
    } catch (error) {
      this.logger.error('Error ending PostgreSQL pool:', error);
    }

    this.logger.log('Database connection closed.');
  }
}
