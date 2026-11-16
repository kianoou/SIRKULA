import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  activeSchema,
  createUserSchema,
  idParamSchema,
  listQuerySchema,
  profileSchema,
  updateUserSchema,
} from '../validators/schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole('admin'), validate({ query: listQuerySchema }), userController.list);
router.post('/', requireRole('admin'), validate({ body: createUserSchema }), userController.create);
router.patch('/:id', requireRole('admin'), validate({ params: idParamSchema, body: updateUserSchema }), userController.update);
router.patch('/:id/active', requireRole('admin'), validate({ params: idParamSchema, body: activeSchema }), userController.setActive);
router.delete('/:id', requireRole('admin'), validate({ params: idParamSchema }), userController.remove);

// Profil pengguna yang sedang masuk.
router.put('/me/profile', validate({ body: profileSchema }), userController.updateProfile);

export default router;
