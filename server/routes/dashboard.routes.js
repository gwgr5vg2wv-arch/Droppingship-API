import { Router } from 'express';
import { dashboardSummary } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/summary', dashboardSummary);

export default router;
