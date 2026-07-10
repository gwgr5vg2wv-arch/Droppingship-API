import { Router } from 'express';
import { listOrders, syncOrders } from '../controllers/orders.controller.js';

const router = Router();

router.get('/', listOrders);
router.get('/sync', syncOrders);

export default router;
