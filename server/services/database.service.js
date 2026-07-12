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
      provider: 'sqlite',
      configured: false,
      connected: false,
      message: 'DATABASE_URL ausente.'
    };
  }

  try {
    await client.$queryRaw`SELECT 1`;
    return {
      provider: 'sqlite',
      configured: true,
      connected: true,
      message: 'Banco conectado.'
    };
  } catch (error) {
    return {
      provider: 'sqlite',
      configured: true,
      connected: false,
      message: 'Falha ao conectar no banco.',
      error: error.message
    };
  }
}
