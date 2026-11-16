import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { forbidden, unauthorized } from '../utils/httpError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const AUTH_COOKIE = 'sirkula_token';

export function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, { httpOnly: true, sameSite: 'lax', secure: env.cookieSecure, path: '/' });
}

function readToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return req.cookies?.[AUTH_COOKIE] || null;
}

/** Melampirkan req.user bila token valid; tidak menolak permintaan. */
export const attachUser = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });
    const rows = await query(
      `SELECT u.id, u.name, u.email, u.role, u.user_type, u.phone, u.whatsapp, u.address,
              u.balance, u.is_active, bp.id AS bank_profile_id
         FROM users u
         LEFT JOIN bank_profiles bp ON bp.seller_id = u.id
        WHERE u.id = ? LIMIT 1`,
      [payload.sub],
    );
    const user = rows[0];
    if (!user || !user.is_active) return next();
    req.user = { ...user, balance: Number(user.balance), is_active: Boolean(user.is_active) };
  } catch {
    // Token kedaluwarsa/rusak diperlakukan sebagai tamu.
  }
  return next();
});

export const requireAuth = (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  return next();
};

export const requireActiveUser = (req, _res, next) => {
  if (req.user && !req.user.is_active) return next(forbidden('Akun Anda dinonaktifkan.'));
  return next();
};
