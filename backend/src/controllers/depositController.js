import path from 'node:path';
import fs from 'node:fs';
import * as depositService from '../services/depositService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { q } from '../middleware/validate.js';
import { env } from '../config/env.js';
import { notFound } from '../utils/httpError.js';
import { removeFiles } from '../middleware/upload.js';

function parseItemsField(body) {
  if (!body.items) return [];
  if (Array.isArray(body.items)) return body.items;
  try {
    const parsed = JSON.parse(body.items);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const list = asyncHandler(async (req, res) => {
  const query = q(req);
  const result = await depositService.listDeposits(req.user, {
    status: query.status || null,
    search: query.search || '',
    dateFrom: query.dateFrom || null,
    dateTo: query.dateTo || null,
    categoryId: query.categoryId ? Number(query.categoryId) : null,
    limit: Number(query.limit) || 20,
    offset: Number(query.offset) || 0,
  });
  res.json({ success: true, data: result });
});

export const get = asyncHandler(async (req, res) => {
  const deposit = await depositService.getDeposit(req.user, req.params.id);
  res.json({ success: true, data: { deposit } });
});

export const create = asyncHandler(async (req, res) => {
  try {
    const deposit = await depositService.createDeposit(
      req.user,
      {
        sellerId: Number(req.body.sellerId),
        depositDate: req.body.depositDate,
        notes: req.body.notes,
        items: parseItemsField(req.body),
      },
      req.files || [],
    );
    res.status(201).json({ success: true, message: 'Pengajuan setoran berhasil dikirim.', data: { deposit } });
  } catch (error) {
    removeFiles(req.files);
    throw error;
  }
});

export const verify = asyncHandler(async (req, res) => {
  const deposit = await depositService.verifyDeposit(req.user, req.params.id, req.body);
  res.json({ success: true, message: 'Setoran berhasil diverifikasi.', data: { deposit } });
});

export const complete = asyncHandler(async (req, res) => {
  const deposit = await depositService.completeDeposit(req.user, req.params.id, req.body || {});
  res.json({
    success: true,
    message: deposit.alreadyCompleted
      ? 'Setoran ini sudah diselesaikan sebelumnya. Saldo tidak ditambahkan lagi.'
      : 'Setoran selesai dan saldo nasabah diperbarui.',
    data: { deposit },
  });
});

export const cancel = asyncHandler(async (req, res) => {
  const deposit = await depositService.cancelDeposit(req.user, req.params.id, req.body.reason);
  res.json({ success: true, message: 'Setoran dibatalkan.', data: { deposit } });
});

export const downloadAttachment = asyncHandler(async (req, res) => {
  const attachment = await depositService.getAttachment(req.user, req.params.attachmentId || req.params.id);
  const filePath = path.join(env.uploadDir, attachment.storedName);
  if (!fs.existsSync(filePath)) throw notFound('File lampiran tidak ditemukan pada server.');
  res.setHeader('Content-Type', attachment.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Disposition',
    `${req.query.inline === 'true' && attachment.mimeType.startsWith('image/') ? 'inline' : 'attachment'}; filename="${encodeURIComponent(attachment.originalName)}"`,
  );
  fs.createReadStream(filePath).pipe(res);
});
