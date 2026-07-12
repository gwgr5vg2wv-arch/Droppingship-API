import { Router } from 'express';
import { buildHealth } from '../services/health.service.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    res.json(await buildHealth());
  } catch (error) {
    next(error);
  }
});

router.get('/live', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

router.get('/ready', async (req, res, next) => {
  try {
    const health = await buildHealth({ ready: true });
    res.status(health.status === 'ok' ? 200 : 503).json(health);
  } catch (error) {
    next(error);
  }
});

export default router;
