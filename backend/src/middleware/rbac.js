import { forbidden } from '../utils/httpError.js';

/** Membatasi endpoint berdasarkan role pengguna. */
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(forbidden('Anda tidak memiliki akses ke fitur ini.'));
  if (!roles.includes(req.user.role)) {
    return next(forbidden('Role Anda tidak memiliki akses ke fitur ini.'));
  }
  return next();
};

export const isAdmin = (user) => user?.role === 'admin';
export const isSeller = (user) => user?.role === 'seller';
export const isBuyer = (user) => user?.role === 'pembeli';

const buyerOf = (deposit) => Number(deposit?.buyerId ?? deposit?.buyer_id);
const sellerOf = (deposit) => Number(deposit?.sellerId ?? deposit?.seller_id);

/**
 * Pemilik data setoran: admin melihat semua, seller hanya miliknya,
 * pembeli hanya setoran yang ia ajukan.
 */
export function canAccessDeposit(user, deposit) {
  if (!user || !deposit) return false;
  if (isAdmin(user)) return true;
  if (isSeller(user)) return sellerOf(deposit) === Number(user.id);
  return buyerOf(deposit) === Number(user.id);
}

export function canManageDeposit(user, deposit) {
  if (!user || !deposit) return false;
  if (isAdmin(user)) return true;
  return isSeller(user) && sellerOf(deposit) === Number(user.id);
}
