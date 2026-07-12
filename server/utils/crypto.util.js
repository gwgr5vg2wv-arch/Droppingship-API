import crypto from 'crypto';
import { env } from '../config/env.js';

const prefix = 'v1';

export function encryptSecret(value) {
  if (!value) return '';
  ensureEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [prefix, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(':');
}

export function decryptSecret(value) {
  if (!value) return '';
  ensureEncryptionKey();
  const [version, iv, tag, encrypted] = String(value).split(':');
  if (version !== prefix || !iv || !tag || !encrypted) throw new Error('Segredo criptografado invalido.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

export function ensureEncryptionKey() {
  if (!env.ENCRYPTION_KEY || env.ENCRYPTION_KEY.length < 32) {
    const error = new Error('ENCRYPTION_KEY deve ter pelo menos 32 caracteres para salvar tokens OAuth.');
    error.status = 503;
    throw error;
  }
}

function encryptionKey() {
  return crypto.createHash('sha256').update(env.ENCRYPTION_KEY).digest();
}
