import test from 'node:test';
import assert from 'node:assert/strict';
import { addDuration, hashToken, normalizeEmail, publicUser, randomToken } from '../server/utils/token.util.js';
import { requiredEnvStatus } from '../server/config/env.js';

test('normalizeEmail trims and lowercases email', () => {
  assert.equal(normalizeEmail('  USER@Example.COM '), 'user@example.com');
});

test('hashToken is deterministic and does not expose raw token', () => {
  const token = 'refresh-token-local';
  const hash = hashToken(token);
  assert.equal(hash, hashToken(token));
  assert.notEqual(hash, token);
  assert.equal(hash.length, 64);
});

test('randomToken returns url-safe entropy', () => {
  const token = randomToken();
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.ok(token.length >= 32);
});

test('addDuration parses supported duration formats', () => {
  const before = Date.now();
  const expires = addDuration('15m', 1).getTime();
  assert.ok(expires - before >= 14 * 60_000);
  assert.ok(expires - before <= 16 * 60_000);
});

test('publicUser removes sensitive auth fields', () => {
  const safe = publicUser({
    id: 'u1',
    email: 'a@test.local',
    passwordHash: 'secret',
    failedLoginCount: 4,
    lockedUntil: new Date(),
    deletedAt: null
  });
  assert.equal(safe.passwordHash, undefined);
  assert.equal(safe.failedLoginCount, undefined);
  assert.equal(safe.lockedUntil, undefined);
});

test('env readiness marks critical secrets as missing or invalid without exposing values', () => {
  const status = requiredEnvStatus();
  assert.ok(status.some((item) => item.name === 'DATABASE_URL'));
  assert.ok(status.every((item) => !String(item.message).includes(process.env.JWT_SECRET || 'never-match-this')));
});
