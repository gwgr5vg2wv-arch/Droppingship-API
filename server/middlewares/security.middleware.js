import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';

export function applySecurity(app) {
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: false
  }));

  app.use(cookieParser(env.SESSION_SECRET || undefined));

  app.use(rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisicoes em pouco tempo. Tente novamente em instantes.' }
  }));

  app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });
}

export function corsOptions() {
  const allowed = (env.FRONTEND_URL || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin || env.NODE_ENV !== 'production' || allowed.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origem nao autorizada pelo CORS.'));
    },
    credentials: true
  };
}
