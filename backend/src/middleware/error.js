import multer from 'multer';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (error, req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? `Ukuran satu file melebihi batas ${(env.maxUploadBytes / 1024 / 1024).toFixed(2)} MB.`
        : error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE'
          ? error.field || 'Jumlah atau format lampiran tidak sesuai.'
          : 'Lampiran tidak dapat diproses.';
    return res.status(400).json({ success: false, message });
  }

  if (error instanceof HttpError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  if (error?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'Data sudah ada. Gunakan nilai yang berbeda.' });
  }
  if (error?.code === 'ER_ROW_IS_REFERENCED_2' || error?.code === 'ER_ROW_IS_REFERENCED') {
    return res.status(409).json({ success: false, message: 'Data masih digunakan oleh data lain sehingga tidak dapat dihapus.' });
  }

  console.error('[error]', error);
  return res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server.',
    ...(env.isProduction ? {} : { debug: error.message }),
  });
};
