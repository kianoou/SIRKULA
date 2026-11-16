import bcrypt from 'bcryptjs';
import * as userModel from '../models/userModel.js';
import * as activity from '../models/activityModel.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/httpError.js';
import { isValidWhatsApp, normalizeWhatsApp } from '../utils/whatsapp.js';

const ROLES = ['admin', 'seller', 'pembeli'];

function validateWhatsApp(value) {
  if (value === undefined) return;
  if (value !== null && value !== '' && !isValidWhatsApp(value)) {
    throw badRequest('Nomor WhatsApp harus terdiri dari 9–15 digit.');
  }
}

export async function listUsers(filters) {
  return userModel.list(filters);
}

export async function createUser(actor, payload) {
  if (!ROLES.includes(payload.role)) throw badRequest('Role pengguna tidak valid.');
  validateWhatsApp(payload.whatsapp);
  const email = payload.email.trim().toLowerCase();
  if (await userModel.findByEmailWithPassword(email)) throw conflict('Email sudah digunakan akun lain.');

  const user = await userModel.create({
    name: payload.name.trim(),
    email,
    passwordHash: await bcrypt.hash(payload.password, 10),
    role: payload.role,
    userType: payload.userType || 'masyarakat',
    phone: payload.phone || null,
    whatsapp: payload.whatsapp ? normalizeWhatsApp(payload.whatsapp) : null,
    address: payload.address || null,
  });

  if (payload.role === 'seller') {
    await userModel.upsertBankProfile(user.id, {
      name: payload.bankName?.trim() || payload.name.trim(),
      address: payload.address || null,
      whatsapp: payload.whatsapp ? normalizeWhatsApp(payload.whatsapp) : null,
      description: payload.bankDescription || null,
      openingHours: payload.openingHours || null,
    });
  }

  await activity.log({
    userId: actor.id, action: 'user.create', entity: 'user', entityId: user.id,
    description: `Membuat akun ${payload.role}: ${user.name}`,
  });
  return user;
}

export async function updateUser(actor, id, payload) {
  const target = await userModel.findById(id);
  if (!target) throw notFound('Pengguna tidak ditemukan.');
  if (payload.role && !ROLES.includes(payload.role)) throw badRequest('Role pengguna tidak valid.');
  validateWhatsApp(payload.whatsapp);
  if (payload.email) {
    const email = payload.email.trim().toLowerCase();
    const existing = await userModel.findByEmailWithPassword(email);
    if (existing && existing.id !== Number(id)) throw conflict('Email sudah digunakan akun lain.');
    payload.email = email;
  }
  if (payload.role && payload.role !== 'seller' && payload.role !== target.role && target.role === 'seller') {
    throw conflict('Ubah data bank sampah terlebih dahulu sebelum mengubah role pengelola.');
  }

  const updated = await userModel.update(id, {
    ...payload,
    whatsapp: payload.whatsapp ? normalizeWhatsApp(payload.whatsapp) : payload.whatsapp,
  });
  if (payload.password) {
    await userModel.updatePassword(id, await bcrypt.hash(payload.password, 10));
  }
  await activity.log({
    userId: actor.id, action: 'user.update', entity: 'user', entityId: id,
    description: `Memperbarui data pengguna ${updated.name}`,
  });
  return updated;
}

export async function setUserActive(actor, id, isActive) {
  if (Number(id) === Number(actor.id) && !isActive) throw conflict('Anda tidak dapat menonaktifkan akun sendiri.');
  const target = await userModel.findById(id);
  if (!target) throw notFound('Pengguna tidak ditemukan.');
  const updated = await userModel.update(id, { isActive });
  await activity.log({
    userId: actor.id, action: isActive ? 'user.activate' : 'user.deactivate', entity: 'user', entityId: id,
    description: `${isActive ? 'Mengaktifkan' : 'Menonaktifkan'} akun ${target.name}`,
  });
  return updated;
}

export async function deleteUser(actor, id) {
  if (Number(id) === Number(actor.id)) throw conflict('Anda tidak dapat menghapus akun sendiri.');
  const target = await userModel.findById(id);
  if (!target) throw notFound('Pengguna tidak ditemukan.');
  if (await userModel.hasDeposits(id)) {
    throw conflict('Pengguna memiliki riwayat setoran. Nonaktifkan akun sebagai gantinya.');
  }
  await userModel.remove(id);
  await activity.log({
    userId: actor.id, action: 'user.delete', entity: 'user', entityId: id,
    description: `Menghapus akun ${target.name}`,
  });
}

export async function updateProfile(userId, payload) {
  validateWhatsApp(payload.whatsapp);
  const updated = await userModel.update(userId, {
    name: payload.name?.trim(),
    phone: payload.phone,
    whatsapp: payload.whatsapp ? normalizeWhatsApp(payload.whatsapp) : payload.whatsapp,
    address: payload.address,
  });
  await activity.log({ userId, action: 'profile.update', entity: 'user', entityId: userId, description: 'Memperbarui profil sendiri' });
  return updated;
}

export async function getBankProfile(user) {
  const sellerId = user.role === 'seller' ? user.id : Number(user.bankProfileSellerId || user.id);
  const profile = await userModel.findBankProfile(sellerId);
  if (!profile) throw notFound('Profil bank sampah belum dibuat.');
  return profile;
}

export async function saveBankProfile(actor, payload) {
  validateWhatsApp(payload.whatsapp);
  const sellerId = actor.role === 'seller' ? actor.id : Number(payload.sellerId);
  if (!sellerId) throw badRequest('Pengelola bank sampah tidak ditentukan.');
  if (actor.role === 'seller' && sellerId !== actor.id) throw forbidden('Anda hanya dapat mengubah bank sampah milik sendiri.');
  const profile = await userModel.upsertBankProfile(sellerId, {
    name: payload.name.trim(),
    address: payload.address,
    whatsapp: payload.whatsapp ? normalizeWhatsApp(payload.whatsapp) : payload.whatsapp,
    description: payload.description,
    openingHours: payload.openingHours,
  });
  await activity.log({
    userId: actor.id, action: 'bank_profile.update', entity: 'bank_profile', entityId: profile.id,
    description: `Memperbarui profil bank sampah ${profile.name}`,
  });
  return profile;
}

export async function listCustomers(sellerId, filters) {
  return userModel.listCustomersForSeller(sellerId, filters);
}

export async function balanceHistory(user, targetUserId, filters) {
  if (user.role === 'pembeli' && Number(targetUserId) !== Number(user.id)) {
    throw forbidden('Anda hanya dapat melihat riwayat saldo sendiri.');
  }
  if (user.role === 'seller' && Number(targetUserId) !== Number(user.id)) {
    const customers = await userModel.listCustomersForSeller(user.id, { limit: 1000, offset: 0 });
    if (!customers.rows.some((row) => Number(row.id) === Number(targetUserId))) {
      throw forbidden('Nasabah ini bukan nasabah bank sampah Anda.');
    }
  }
  return userModel.listBalanceHistory(targetUserId, filters);
}

