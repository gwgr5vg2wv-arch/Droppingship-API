import fs from 'fs/promises';
import { env, featureFlags, requiredEnvStatus } from '../config/env.js';
import { providerStatus } from '../../src/services/search/productSearch.service.js';
import { checkDatabase } from './database.service.js';

export async function buildHealth({ ready = false } = {}) {
  const modules = requiredEnvStatus();
  const database = await checkDatabase();
  const integrationStatus = await providerStatus().catch(() => []);
  const dbFileOk = await fs.access(new URL('../data/db.json', import.meta.url)).then(() => true).catch(() => false);
  const unavailableModules = modules.filter((item) => !item.configured || item.valid === false);
  const readyFailures = [
    ...unavailableModules,
    ...(database.connected ? [] : [{ name: 'DATABASE_CONNECTION', message: database.message }]),
    ...(database.migrations && !database.migrations.ok ? [{ name: 'DATABASE_MIGRATIONS', message: 'Migrations pendentes ou sem resolucao.' }] : []),
    ...(database.schema && !database.schema.ok ? [{ name: 'DATABASE_SCHEMA', message: 'Tabelas principais ausentes. Execute as migrations do Prisma.' }] : [])
  ];

  return {
    status: ready && readyFailures.length ? 'degraded' : 'ok',
    service: 'Droppingship API',
    version: process.env.npm_package_version || '1.0.0',
    environment: env.NODE_ENV,
    time: new Date().toISOString(),
    database,
    localStore: {
      available: dbFileOk
    },
    cache: {
      provider: 'memory',
      message: 'Cache em memoria; Redis ainda nao configurado.'
    },
    queue: {
      provider: env.REDIS_URL ? 'redis' : 'not-configured',
      configured: Boolean(env.REDIS_URL)
    },
    featureFlags,
    integrations: integrationStatus.map((item) => ({
      name: item.name,
      configured: item.configured,
      enabled: item.enabled,
      ok: item.ok,
      message: item.message
    })),
    unavailableModules,
    readyFailures
  };
}
