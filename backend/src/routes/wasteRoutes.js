import { Router } from 'express';
import * as wasteController from '../controllers/wasteController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { categorySchema, idParamSchema, listQuerySchema, typeSchema } from '../validators/schemas.js';

const router = Router();
const manager = requireRole('admin', 'seller');

// Katalog harga dapat dibaca publik; pengelolaan tetap memerlukan login + role.
router.get('/categories', validate({ query: listQuerySchema }), wasteController.listCategories);
router.post('/categories', requireAuth, manager, validate({ body: categorySchema }), wasteController.createCategory);
router.put('/categories/:id', requireAuth, manager, validate({ params: idParamSchema, body: categorySchema }), wasteController.updateCategory);
router.delete('/categories/:id', requireAuth, manager, validate({ params: idParamSchema }), wasteController.deleteCategory);

router.get('/waste-types', validate({ query: listQuerySchema }), wasteController.listTypes);
router.post('/waste-types', requireAuth, manager, validate({ body: typeSchema }), wasteController.createType);
router.put('/waste-types/:id', requireAuth, manager, validate({ params: idParamSchema, body: typeSchema }), wasteController.updateType);
router.delete('/waste-types/:id', requireAuth, manager, validate({ params: idParamSchema }), wasteController.deleteType);

export default router;
