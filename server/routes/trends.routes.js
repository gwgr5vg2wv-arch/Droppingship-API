import { Router } from 'express';
import { listTrends } from '../controllers/trends.controller.js';

const router = Router();

router.get('/', listTrends);

export default router;
