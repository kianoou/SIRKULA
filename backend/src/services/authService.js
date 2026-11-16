import bcrypt from 'bcryptjs';
import * as userModel from '../models/userModel.js';
import * as activity from '../models/activityModel.js';
import { badRequest, conflict, forbidden, unauthorized } from '../utils/httpError.js';
import { normalizeWhatsApp, isValidWhatsApp } from '../utils/whatsapp.js';

export async function register({ name, email, password, userType, phone, whatsapp, address }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await userModel.findByEmailWithPassword(normalizedEmail);
  if (existing) throw conflict('Email sudah terdaftar. Silakan masuk atau gunakan email lain.');
  if (whatsapp && !isValidWhatsApp(whatsapp)) throw badRequest('Nomor WhatsApp harus terdiri dari 9–15 digit.');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userModel.create({
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'pembeli',
    userType: userType || 'masyarakat',
    phone: phone || null,
    whatsapp: whatsapp ? normalizeWhatsApp(whatsapp) : null,
    address: address || null,
  });
  await activity.log({ userId: user.id, action: 'auth.register', entity: 'user', entityId: user.id, description: 'Registrasi akun nasabah baru' });
  return user;
}

export async function login({ email, password }, ip) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await userModel.findByEmailWithPassword(normalizedEmail);
  if (!user) {
    await activity.log({ userId: null, action: 'auth.login.failed', entity: 'user', description: `Percobaan masuk gagal untuk ${normalizedEmail}`, ip });
    throw unauthorized('Email atau password salah.');
  }
  if (!user.isActive) {
    await activity.log({ userId: user.id, action: 'auth.login.blocked', entity: 'user', entityId: user.id, description: 'Percobaan masuk pada akun nonaktif', ip });
    throw forbidden('Akun Anda dinonaktifkan. Hubungi administrator.');
  }
  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    await activity.log({ userId: user.id, action: 'auth.login.failed', entity: 'user', entityId: user.id, description: 'Password tidak sesuai', ip });
    throw unauthorized('Email atau password salah.');
  }
  await userModel.touchLogin(user.id);
  await activity.log({ userId: user.id, action: 'auth.login', entity: 'user', entityId: user.id, description: 'Masuk ke aplikasi', ip });
  const { passwordHash, ...safeUser } = user;
  return { user: { ...safeUser, balance: Number(safeUser.balance) }, role: safeUser.role };
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await userModel.findByEmailWithPassword((await userModel.findById(userId)).email);
  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) throw badRequest('Password saat ini tidak sesuai.');
  await userModel.updatePassword(userId, await bcrypt.hash(newPassword, 10));
  await activity.log({ userId, action: 'auth.password', entity: 'user', entityId: userId, description: 'Password diubah' });
}
