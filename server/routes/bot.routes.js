import { Router } from 'express';
import { scanProducts } from '../controllers/bot.controller.js';

const router = Router();

router.post('/scan', scanProducts);

export default router;
