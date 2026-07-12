import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

let prisma;

export function getPrisma() {
  if (!env.DATABASE_URL) return null;
  if (!prisma) {
    prisma = new PrismaClient({
      log: env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error']
    });
  }
  return prisma;
}

export async function checkDatabase() {
  const client = getPrisma();

  if (!client) {
    return {
      provider: 'postgresql',
      configured: false,
      connected: false,
      message: 'DATABASE_URL ausente.'
    };
  }

  try {
    await client.$queryRaw`SELECT 1`;
    const migrationTable = await client.$queryRaw`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = '_prisma_migrations'
      ) AS exists
    `;
    const hasMigrationTable = Boolean(migrationTable[0]?.exists);
    const migrations = hasMigrationTable
      ? await client.$queryRaw`
          SELECT COUNT(*)::int AS total,
                 COUNT(*) FILTER (WHERE finished_at IS NOT NULL)::int AS finished,
                 COUNT(*) FILTER (WHERE rolled_back_at IS NOT NULL)::int AS rolled_back,
                 COUNT(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS unresolved
          FROM "_prisma_migrations"
        `
      : [{ total: 0, finished: 0, rolled_back: 0, unresolved: 0 }];
    const migrationState = migrations[0] || { total: 0, finished: 0, rolled_back: 0, unresolved: 0 };
    return {
      provider: 'postgresql',
      configured: true,
      connected: true,
      migrations: {
        total: Number(migrationState.total || 0),
        finished: Number(migrationState.finished || 0),
        rolledBack: Number(migrationState.rolled_back || 0),
        unresolved: Number(migrationState.unresolved || 0),
        ok: Number(migrationState.unresolved || 0) === 0
      },
      message: 'Banco conectado.'
    };
  } catch (error) {
    return {
      provider: 'postgresql',
      configured: true,
      connected: false,
      message: 'Falha ao conectar no banco.',
      error: error.message
    };
  }
}
