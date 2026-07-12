import { Router } from 'express';
import { integrationStatus, oauthCallback, oauthStart } from '../controllers/integrations.controller.js';
import { requireAuth, requireRole, requireWorkspace } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/status', integrationStatus);
router.get('/oauth/:marketplace/start', requireAuth, requireWorkspace, requireRole('admin'), oauthStart);
router.get('/oauth/:marketplace/callback', oauthCallback);

export default router;
