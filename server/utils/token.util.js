import crypto from 'crypto';

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function addDuration(value, fallbackMs) {
  const match = /^(\d+)([smhd])$/.exec(String(value || ''));
  if (!match) return new Date(Date.now() + fallbackMs);
  const amount = Number(match[1]);
  const unit = match[2];
  const factors = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return new Date(Date.now() + amount * factors[unit]);
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function publicUser(user) {
  if (!user) return null;
  const {
    passwordHash,
    failedLoginCount,
    lockedUntil,
    deletedAt,
    ...safe
  } = user;
  return safe;
}
