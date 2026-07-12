import { Router } from 'express';
import { providerStatus } from '../../src/services/search/productSearch.service.js';

const router = Router();

router.get('/providers/status', async (req, res, next) => {
  try {
    res.json({ providers: await providerStatus() });
  } catch (error) {
    next(error);
  }
});

export default router;
