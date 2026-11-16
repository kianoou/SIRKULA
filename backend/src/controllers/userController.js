import * as userService from '../services/userService.js';
import * as activity from '../models/activityModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { q } from '../middleware/validate.js';

export const list = asyncHandler(async (req, res) => {
  const query = q(req);
  const result = await userService.listUsers({
    search: query.search || '',
    role: query.role || null,
    isActive: query.isActive === undefined ? null : query.isActive === 'true' || query.isActive === true,
    limit: Number(query.limit) || 20,
    offset: Number(query.offset) || 0,
  });
  res.json({ success: true, data: result });
});

export const create = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.user, req.body);
  res.status(201).json({ success: true, message: 'Pengguna berhasil dibuat.', data: { user } });
});

export const update = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.user, req.params.id, req.body);
  res.json({ success: true, message: 'Data pengguna diperbarui.', data: { user } });
});

export const setActive = asyncHandler(async (req, res) => {
  const user = await userService.setUserActive(req.user, req.params.id, req.body.isActive);
  res.json({ success: true, message: req.body.isActive ? 'Akun diaktifkan.' : 'Akun dinonaktifkan.', data: { user } });
});

export const remove = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.user, req.params.id);
  res.json({ success: true, message: 'Pengguna dihapus.' });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  res.json({ success: true, message: 'Profil diperbarui.', data: { user } });
});

export const customers = asyncHandler(async (req, res) => {
  const query = q(req);
  const sellerId = req.user.role === 'admin' && query.sellerId ? Number(query.sellerId) : req.user.id;
  const result = await userService.listCustomers(sellerId, {
    search: query.search || '',
    limit: Number(query.limit) || 20,
    offset: Number(query.offset) || 0,
  });
  res.json({ success: true, data: result });
});

export const balanceHistory = asyncHandler(async (req, res) => {
  const query = q(req);
  const targetId = req.params.userId ? Number(req.params.userId) : req.user.id;
  const result = await userService.balanceHistory(req.user, targetId, {
    limit: Number(query.limit) || 20,
    offset: Number(query.offset) || 0,
  });
  res.json({ success: true, data: result });
});

export const getBankProfile = asyncHandler(async (req, res) => {
  const profile = await userService.getBankProfile(req.user);
  res.json({ success: true, data: { bankProfile: profile } });
});

export const saveBankProfile = asyncHandler(async (req, res) => {
  const profile = await userService.saveBankProfile(req.user, req.body);
  res.json({ success: true, message: 'Profil bank sampah disimpan.', data: { bankProfile: profile } });
});

export const activityLogs = asyncHandler(async (req, res) => {
  const query = q(req);
  const result = await activity.list({
    limit: Number(query.limit) || 50,
    offset: Number(query.offset) || 0,
    action: query.action || null,
    userId: query.userId ? Number(query.userId) : null,
  });
  res.json({ success: true, data: result });
});
