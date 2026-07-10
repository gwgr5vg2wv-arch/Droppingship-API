import { Router } from 'express';
import {
  getSystemCredentials,
  getSystemCredentialsStatus,
  saveSystemCredentials,
  testMercadoLivre
} from '../controllers/systemCredentials.controller.js';

const router = Router();

router.get('/', getSystemCredentials);
router.post('/', saveSystemCredentials);
router.get('/status', getSystemCredentialsStatus);
router.get('/test/mercadolivre', testMercadoLivre);

export default router;
