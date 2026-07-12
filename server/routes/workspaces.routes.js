import { Router } from 'express';
import {
  create,
  deleteMember,
  index,
  invitations,
  members,
  patch,
  patchMember,
  show
} from '../controllers/workspaces.controller.js';
import { requireAuth, requireRole, requireWorkspace } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.get('/', index);
router.post('/', create);
router.get('/:workspaceId', requireWorkspace, show);
router.patch('/:workspaceId', requireWorkspace, requireRole('admin'), patch);
router.get('/:workspaceId/members', requireWorkspace, requireRole('admin'), members);
router.post('/:workspaceId/invitations', requireWorkspace, requireRole('admin'), invitations);
router.patch('/:workspaceId/members/:memberId', requireWorkspace, requireRole('admin'), patchMember);
router.delete('/:workspaceId/members/:memberId', requireWorkspace, requireRole('admin'), deleteMember);

export default router;
