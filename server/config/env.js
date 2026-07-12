import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.string().url().optional().or(z.literal('')),
  FRONTEND_URL: z.string().optional().default(''),
  DATABASE_URL: z.string().optional().default(''),
  JWT_SECRET: z.string().optional().default(''),
  JWT_REFRESH_SECRET: z.string().optional().default(''),
  JWT_ACCESS_EXPIRES_IN: z.string().optional().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().optional().default('30d'),
  ENCRYPTION_KEY: z.string().optional().default(''),
  SESSION_SECRET: z.string().optional().default(''),
  COOKIE_NAME: z.string().optional().default('ds_refresh'),
  COOKIE_DOMAIN: z.string().optional().default(''),
  EMAIL_PROVIDER: z.enum(['none', 'smtp']).default('none'),
  EMAIL_FROM: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  REDIS_URL: z.string().optional().default(''),
  MARKETPLACE_WRITE_ENABLED: z.enum(['true', 'false']).default('false'),
  AI_PATCH_ENABLED: z.enum(['true', 'false']).default('false'),
  AUTO_APPLY_PATCHES: z.enum(['true', 'false']).default('false'),
  SEARCH_PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  SEARCH_CACHE_TTL_MS: z.coerce.number().int().positive().default(600000)
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.warn('[CONFIG] Variaveis invalidas:', parsed.error.flatten().fieldErrors);
}

export const env = parsed.success ? parsed.data : schema.parse({});

export const featureFlags = {
  marketplaceWriteEnabled: env.MARKETPLACE_WRITE_ENABLED === 'true',
  aiPatchEnabled: env.AI_PATCH_ENABLED === 'true',
  autoApplyPatches: env.AUTO_APPLY_PATCHES === 'true'
};

export function validateSecret(name, value, minLength = 32) {
  return {
    name,
    configured: Boolean(value),
    valid: !value || value.length >= minLength,
    message: !value ? `${name} ausente.` : (value.length >= minLength ? 'Configurada.' : `${name} deve ter pelo menos ${minLength} caracteres.`)
  };
}

export function requiredEnvStatus() {
  const checks = [
    ['DATABASE_URL', env.DATABASE_URL, 'Banco PostgreSQL nao configurado.'],
    ['JWT_SECRET', env.JWT_SECRET, 'JWT_SECRET ausente.'],
    ['JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET ausente.'],
    ['ENCRYPTION_KEY', env.ENCRYPTION_KEY, 'ENCRYPTION_KEY ausente.'],
    ['SESSION_SECRET', env.SESSION_SECRET, 'SESSION_SECRET ausente.']
  ];

  return checks.map(([name, value, message]) => {
    const secret = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY', 'SESSION_SECRET'].includes(name)
      ? validateSecret(name, value, name === 'ENCRYPTION_KEY' ? 32 : 32)
      : null;
    return {
      name,
      configured: Boolean(value),
      valid: secret ? secret.valid : Boolean(value),
      message: value ? (secret?.message || 'Configurada.') : message
    };
  });
}
