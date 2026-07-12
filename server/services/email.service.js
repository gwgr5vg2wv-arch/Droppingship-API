import { env } from '../config/env.js';

export async function sendTransactionalEmail({ to, subject, text }) {
  if (env.EMAIL_PROVIDER === 'none') {
    if (env.NODE_ENV === 'production') {
      const error = new Error('Provedor de email nao configurado.');
      error.status = 503;
      throw error;
    }
    console.warn(`[EMAIL:DEV] ${subject} para ${to}. Configure EMAIL_PROVIDER=smtp para envio real.`);
    return { sent: false, provider: 'none', developmentOnly: true, text };
  }

  const error = new Error('Envio SMTP ainda nao configurado neste build.');
  error.status = 503;
  throw error;
}
