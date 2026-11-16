import { Router } from 'express';
import * as depositController from '../controllers/depositController.js';
import * as userController from '../controllers/userController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { uploadAttachments } from '../middleware/upload.js';
import {
  cancelSchema,
  createDepositSchema,
  idParamSchema,
  listQuerySchema,
  verifySchema,
} from '../validators/schemas.js';
import { z } from 'zod';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: listQuerySchema }), depositController.list);
router.post(
  '/',
  requireRole('pembeli'),
  uploadAttachments,
  validate({ body: createDepositSchema }),
  depositController.create,
);
router.get('/:id', validate({ params: idParamSchema }), depositController.get);
router.patch(
  '/:id/verify',
  requireRole('admin', 'seller'),
  validate({ params: idParamSchema, body: verifySchema }),
  depositController.verify,
);
router.patch(
  '/:id/complete',
  requireRole('admin', 'seller'),
  validate({ params: idParamSchema }),
  depositController.complete,
);
router.patch(
  '/:id/cancel',
  requireRole('admin', 'seller'),
  validate({ params: idParamSchema, body: cancelSchema }),
  depositController.cancel,
);

// Nasabah bank sampah milik seller.
router.get(
  '/-customers/list',
  requireRole('admin', 'seller'),
  validate({ query: listQuerySchema }),
  userController.customers,
);

// Lampiran (akses mengikuti kepemilikan setoran).
router.get(
  '/attachments/:id',
  validate({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  depositController.downloadAttachment,
);

export default router;
