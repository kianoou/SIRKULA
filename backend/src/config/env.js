import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';

function bool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function int(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const rootDir = path.resolve(import.meta.dirname, '..', '..');

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
  port: int(process.env.PORT, 4000),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: int(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sirkula',
    connectionLimit: int(process.env.DB_CONNECTION_LIMIT, 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : crypto.randomBytes(32).toString('hex')),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cookieSecure: bool(process.env.COOKIE_SECURE, (process.env.NODE_ENV || "development") === "production"),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  uploadDir: path.resolve(rootDir, process.env.UPLOAD_DIR || './backend/uploads'),
  maxUploadBytes: int(process.env.MAX_UPLOAD_BYTES, 1310720),
  demoPassword: process.env.DEMO_PASSWORD || 'Sirkula#2026',
  uploads: {
    maxFiles: 3,
    mimeTypes: new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ]),
    extensions: new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt']),
  },
};

if (env.isProduction && env.jwt.secret.length < 32) {
  throw new Error('JWT_SECRET wajib diisi minimal 32 karakter pada mode production.');
}
