import * as dashboardService from '../services/dashboardService.js';
import * as reportService from '../services/reportService.js';
import * as settingService from '../services/settingService.js';
import * as userModel from '../models/userModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { q } from '../middleware/validate.js';

export const get = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboard(req.user);
  res.json({ success: true, data });
});

export const report = asyncHandler(async (req, res) => {
  const query = q(req);
  const data = await reportService.getReport(req.user, {
    dateFrom: query.dateFrom || null,
    dateTo: query.dateTo || null,
  });
  res.json({ success: true, data });
});

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await settingService.getSettings();
  res.json({ success: true, data: { settings } });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingService.updateSettings(req.user, req.body);
  res.json({ success: true, message: 'Pengaturan aplikasi disimpan.', data: { settings } });
});

export const publicInfo = asyncHandler(async (_req, res) => {
  const [settings, banks] = await Promise.all([
    settingService.getPublicSettings(),
    userModel.listBankProfiles({ onlyActive: true }),
  ]);
  res.json({ success: true, data: { settings, banks } });
});
