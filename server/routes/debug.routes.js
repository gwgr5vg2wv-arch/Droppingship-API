import { Router } from 'express';
import { checkNetwork, checkMercadoLivre, getLastDebugInfo } from '../controllers/debug.controller.js';

const router = Router();

router.get('/network', checkNetwork);
router.get('/mercadolivre', checkMercadoLivre);
router.get('/last-error', getLastDebugInfo);

export default router;
