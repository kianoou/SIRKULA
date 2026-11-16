import * as wasteService from '../services/wasteService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { q } from '../middleware/validate.js';

export const listCategories = asyncHandler(async (req, res) => {
  const query = q(req);
  const rows = await wasteService.listCategories({
    search: query.search || '',
    onlyActive: query.onlyActive === 'true',
  });
  res.json({ success: true, data: rows });
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await wasteService.createCategory(req.user, req.body);
  res.status(201).json({ success: true, message: 'Kategori ditambahkan.', data: { category } });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await wasteService.updateCategory(req.user, req.params.id, req.body);
  res.json({ success: true, message: 'Kategori diperbarui.', data: { category } });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await wasteService.deleteCategory(req.user, req.params.id);
  res.json({ success: true, message: 'Kategori dihapus.' });
});

export const listTypes = asyncHandler(async (req, res) => {
  const query = q(req);
  const rows = await wasteService.listTypes({
    search: query.search || '',
    categoryId: query.categoryId ? Number(query.categoryId) : null,
    onlyActive: query.onlyActive === 'true',
  });
  res.json({ success: true, data: rows });
});

export const createType = asyncHandler(async (req, res) => {
  const type = await wasteService.createType(req.user, req.body);
  res.status(201).json({ success: true, message: 'Jenis sampah ditambahkan.', data: { type } });
});

export const updateType = asyncHandler(async (req, res) => {
  const type = await wasteService.updateType(req.user, req.params.id, req.body);
  res.json({ success: true, message: 'Jenis sampah diperbarui.', data: { type } });
});

export const deleteType = asyncHandler(async (req, res) => {
  await wasteService.deleteType(req.user, req.params.id);
  res.json({ success: true, message: 'Jenis sampah dihapus.' });
});
