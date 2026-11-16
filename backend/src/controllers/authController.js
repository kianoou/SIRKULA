import * as authService from '../services/authService.js';
import { clearAuthCookie, setAuthCookie, signToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  setAuthCookie(res, signToken(user));
  res.status(201).json({ success: true, message: 'Registrasi berhasil.', data: { user } });
});

export const login = asyncHandler(async (req, res) => {
  const { user } = await authService.login(req.body, req.ip);
  setAuthCookie(res, signToken(user));
  res.json({ success: true, message: 'Berhasil masuk.', data: { user } });
});

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Anda telah keluar.' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user || null } });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  res.json({ success: true, message: 'Password berhasil diperbarui.' });
});
