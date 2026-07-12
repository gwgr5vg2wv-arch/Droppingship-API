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
    const migrations = await client.$queryRaw`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE finished_at IS NOT NULL)::int AS finished,
             COUNT(*) FILTER (WHERE rolled_back_at IS NOT NULL)::int AS rolled_back
      FROM "_prisma_migrations"
    `.catch(() => [{ total: 0, finished: 0, rolled_back: 0 }]);
    const migrationState = migrations[0] || { total: 0, finished: 0, rolled_back: 0 };
    return {
      provider: 'postgresql',
      configured: true,
      connected: true,
      migrations: {
        total: Number(migrationState.total || 0),
        finished: Number(migrationState.finished || 0),
        rolledBack: Number(migrationState.rolled_back || 0),
        ok: Number(migrationState.rolled_back || 0) === 0
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
