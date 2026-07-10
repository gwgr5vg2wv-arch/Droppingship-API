import { Router } from 'express';
import { integrationStatus, oauthCallback, oauthStart } from '../controllers/integrations.controller.js';

const router = Router();

router.get('/status', integrationStatus);
router.get('/oauth/:marketplace/start', oauthStart);
router.get('/oauth/:marketplace/callback', oauthCallback);

export default router;
