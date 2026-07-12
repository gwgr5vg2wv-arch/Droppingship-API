import { Router } from 'express';
import {
  deleteSession,
  forgotPassword,
  login,
  logout,
  logoutEverywhere,
  me,
  refresh,
  register,
  resetPasswordController,
  sendEmailVerification,
  sessions,
  verifyEmailController
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', me);
router.post('/logout', logout);
router.post('/logout-all', requireAuth, logoutEverywhere);
router.get('/sessions', requireAuth, sessions);
router.delete('/sessions/:sessionId', requireAuth, deleteSession);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordController);
router.post('/send-verification', requireAuth, sendEmailVerification);
router.post('/verify-email', verifyEmailController);

export default router;
