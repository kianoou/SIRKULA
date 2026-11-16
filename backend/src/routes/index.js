import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { bankProfileSchema, listQuerySchema, settingsSchema } from '../validators/schemas.js';

import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import wasteRoutes from './wasteRoutes.js';
import depositRoutes from './depositRoutes.js';
import * as dashboardController from '../controllers/dashboardController.js';
import * as userController from '../controllers/userController.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/deposits', depositRoutes);

// Informasi publik (tanpa login).
router.get('/public/info', dashboardController.publicInfo);

// Dashboard sesuai role.
router.get('/dashboard', requireAuth, dashboardController.get);

// Laporan & pengaturan.
router.get('/reports', requireAuth, requireRole('admin', 'seller'), validate({ query: listQuerySchema }), dashboardController.report);
router.get('/settings', requireAuth, requireRole('admin'), dashboardController.getSettings);
router.put('/settings', requireAuth, requireRole('admin'), validate({ body: settingsSchema }), dashboardController.updateSettings);

// Nasabah untuk pengelola.
router.get('/customers', requireAuth, requireRole('admin', 'seller'), validate({ query: listQuerySchema }), userController.customers);

// Riwayat saldo: /balance untuk milik sendiri, /balance/:userId untuk admin & seller.
router.get('/balance', requireAuth, userController.balanceHistory);
router.get('/balance/:userId', requireAuth, userController.balanceHistory);

// Profil bank sampah pengelola.
router.get('/bank-profile', requireAuth, requireRole('admin', 'seller'), userController.getBankProfile);
router.put('/bank-profile', requireAuth, requireRole('admin', 'seller'), validate({ body: bankProfileSchema }), userController.saveBankProfile);

// Log aktivitas sistem (admin).
router.get('/activity-logs', requireAuth, requireRole('admin'), validate({ query: listQuerySchema }), userController.activityLogs);

// Katalog kategori & jenis sampah (setelah rute publik/role agar tidak menutupi).
router.use('/', wasteRoutes);

export default router;
