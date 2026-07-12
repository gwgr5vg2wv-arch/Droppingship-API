import { env } from '../config/env.js';

export async function sendTransactionalEmail({ to, subject, text }) {
  // Em desenvolvimento, apenas log
  if (env.NODE_ENV !== 'production') {
    console.log(`[EMAIL:DEV] ${subject} para ${to}`);
    return { sent: true, provider: 'dev', developmentOnly: true };
  }

  // Em produção, retornar erro se não configurado
  const error = new Error('Provedor de email nao configurado.');
  error.status = 503;
  throw error;
}
