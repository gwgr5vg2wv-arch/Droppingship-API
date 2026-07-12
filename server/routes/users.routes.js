import { Router } from 'express';
import { deleteMe, me, patchMe, patchPassword } from '../controllers/users.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.get('/me', me);
router.patch('/me', patchMe);
router.patch('/me/password', patchPassword);
router.delete('/me', deleteMe);

export default router;
