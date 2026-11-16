import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
  const mimeAllowed = env.uploads.mimeTypes.has(file.mimetype) || file.mimetype === 'application/octet-stream';
  if (mimeAllowed && env.uploads.extensions.has(ext)) return cb(null, true);
  return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `Format file tidak didukung: ${file.originalname}`));
}

export const uploadAttachments = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxUploadBytes,
    files: env.uploads.maxFiles,
    fields: 20,
  },
}).array('attachments', env.uploads.maxFiles);

/** Hapus file yang sudah tersimpan bila permintaan gagal. */
export function removeFiles(files) {
  for (const file of files || []) {
    fs.promises.unlink(file.path).catch(() => {});
  }
}
