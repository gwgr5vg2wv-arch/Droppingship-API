import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

test('phase 1 auth integration suite requires TEST_DATABASE_URL', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  try {
    await prisma.$queryRaw`SELECT 1`;
    const models = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('User', 'Workspace', 'WorkspaceMember', 'UserSession', 'PasswordResetToken', 'EmailVerificationToken', 'AuditLog')
    `;
    assert.equal(models.length, 7);
  } finally {
    await prisma.$disconnect();
  }
});
