import { withTransaction } from '../config/db.js';
import * as depositModel from '../models/depositModel.js';
import * as wasteModel from '../models/wasteModel.js';
import * as userModel from '../models/userModel.js';
import * as activity from '../models/activityModel.js';
import { removeFiles } from '../middleware/upload.js';
import { env } from '../config/env.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/httpError.js';
import { canAccessDeposit, canManageDeposit, isAdmin, isBuyer, isSeller } from '../middleware/rbac.js';

const round = (value) => Math.round(Number(value));

function scopeFor(user) {
  if (isAdmin(user)) return {};
  if (isSeller(user)) return { sellerId: user.id };
  return { buyerId: user.id };
}

export async function listDeposits(user, filters = {}) {
  const scope = scopeFor(user);
  return depositModel.list({ ...filters, ...scope });
}

export async function getDeposit(user, id) {
  const deposit = await depositModel.findById(id);
  if (!deposit) throw notFound('Setoran tidak ditemukan.');
  if (!canAccessDeposit(user, deposit)) throw forbidden('Anda tidak memiliki akses ke setoran ini.');
  const [details, attachments] = await Promise.all([
    depositModel.findDetails(id),
    depositModel.findAttachments(id),
  ]);
  return { ...deposit, details, attachments };
}

export async function createDeposit(user, payload, files = []) {
  if (!isBuyer(user)) throw forbidden('Hanya akun pembeli yang dapat mengajukan setoran.');
  try {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > env.maxUploadBytes) {
      throw badRequest(`Total ukuran lampiran melebihi ${(env.maxUploadBytes / 1024 / 1024).toFixed(2)} MB.`);
    }
    const seller = await userModel.findById(payload.sellerId);
    if (!seller || seller.role !== 'seller' || !seller.isActive) {
      throw badRequest('Pengelola bank sampah yang dipilih tidak tersedia.');
    }
    const bankProfile = await userModel.findBankProfile(payload.sellerId);
    if (!bankProfile || !bankProfile.isActive) throw badRequest('Bank sampah yang dipilih sedang tidak aktif.');

    const seen = new Set();
    const items = [];
    for (const item of payload.items) {
      if (seen.has(item.wasteTypeId)) throw badRequest('Jenis sampah yang sama tidak dapat dipilih dua kali.');
      seen.add(item.wasteTypeId);
      const type = await wasteModel.findType(item.wasteTypeId);
      if (!type || !type.isActive || !type.categoryActive) {
        throw badRequest('Jenis sampah yang dipilih tidak aktif.');
      }
      const estimated = Number(item.estimatedWeight);
      if (!Number.isFinite(estimated) || estimated <= 0) throw badRequest('Estimasi berat harus lebih dari 0 kg.');
      items.push({
        wasteTypeId: type.id,
        categoryName: type.categoryName,
        wasteName: type.name,
        estimatedWeight: estimated,
        pricePerKg: type.pricePerKg,
        subtotal: 0,
      });
    }
    if (!items.length) throw badRequest('Pilih minimal satu jenis sampah.');

    const depositId = await withTransaction(async (conn) => {
      const id = await depositModel.createHeader(conn, {
        buyerId: user.id,
        sellerId: payload.sellerId,
        depositDate: payload.depositDate,
        notes: payload.notes,
      });
      for (const item of items) await depositModel.insertDetail(conn, id, item);
      if (files.length) {
        await depositModel.insertAttachments(
          conn,
          id,
          files.map((file) => ({
            originalName: file.originalname,
            storedName: file.filename,
            mimeType: file.mimetype,
            sizeBytes: file.size,
          })),
        );
      }
      return id;
    });

    await activity.log({
      userId: user.id, action: 'deposit.create', entity: 'deposit', entityId: depositId,
      description: `Mengajukan setoran baru untuk ${items.map((item) => item.wasteName).join(', ')}`,
    });
    return getDeposit(user, depositId);
  } catch (error) {
    removeFiles(files);
    throw error;
  }
}

export async function verifyDeposit(user, id, payload) {
  const result = await withTransaction(async (conn) => {
    const locked = await depositModel.lockById(conn, id);
    if (!locked) throw notFound('Setoran tidak ditemukan.');
    if (!canManageDeposit(user, locked)) throw forbidden('Anda tidak dapat memverifikasi setoran ini.');
    if (locked.status !== 'menunggu') {
      throw conflict(`Setoran berstatus "${locked.status}" tidak dapat diverifikasi.`);
    }

    const [details] = await conn.execute(
      'SELECT id, waste_name_snapshot AS wasteName FROM deposit_details WHERE deposit_id = ? FOR UPDATE',
      [id],
    );
    const provided = new Map(payload.items.map((item) => [Number(item.detailId), item]));
    for (const detail of details) {
      if (!provided.has(Number(detail.id))) {
        throw badRequest(`Berat aktual untuk "${detail.wasteName}" belum diisi.`);
      }
    }
    if (provided.size !== details.length) throw badRequest('Rincian verifikasi tidak sesuai dengan setoran ini.');

    let totalValue = 0;
    for (const detail of details) {
      const input = provided.get(Number(detail.id));
      const actualWeight = Number(input.actualWeight);
      const pricePerKg = Number(input.pricePerKg);
      if (!Number.isFinite(actualWeight) || actualWeight < 0) throw badRequest('Berat aktual tidak boleh negatif.');
      if (!Number.isFinite(pricePerKg) || pricePerKg < 0) throw badRequest('Harga per kg tidak boleh negatif.');
      const subtotal = round(actualWeight * pricePerKg);
      totalValue += subtotal;
      await depositModel.updateDetail(conn, detail.id, { actualWeight, pricePerKg, subtotal });
    }

    await depositModel.updateStatus(conn, id, 'diverifikasi', {
      verifiedBy: user.id,
      totalValue,
      notes: payload.managerNotes,
    });
    return { totalValue };
  });

  await activity.log({
    userId: user.id, action: 'deposit.verify', entity: 'deposit', entityId: id,
    description: `Memverifikasi setoran dengan nilai ${result.totalValue}`,
  });
  return getDeposit(user, id);
}

export async function completeDeposit(user, id, payload = {}) {
  const outcome = await withTransaction(async (conn) => {
    const locked = await depositModel.lockById(conn, id);
    if (!locked) throw notFound('Setoran tidak ditemukan.');
    if (!canManageDeposit(user, locked)) throw forbidden('Anda tidak dapat menyelesaikan setoran ini.');

    if (locked.status === 'selesai') {
      return { alreadyCompleted: true };
    }
    if (locked.status !== 'diverifikasi') {
      throw conflict(`Setoran berstatus "${locked.status}" tidak dapat diselesaikan.`);
    }
    if (locked.balanceCredited) {
      throw conflict('Saldo setoran ini sudah dikreditkan.');
    }

    const paymentMethod = payload.paymentMethod === 'transfer' ? 'transfer' : 'cash';
    locked.paymentMethod = paymentMethod;

    const buyer = await depositModel.lockBuyerBalance(conn, locked.buyerId);
    if (!buyer) throw notFound('Nasabah pemilik setoran tidak ditemukan.');
    const before = Number(buyer.balance);
    const amount = Number(locked.totalValue);
    const after = before + amount;

    // UNIQUE(deposit_id) pada tabel transactions mencegah kredit ganda.
    await depositModel.creditBuyer({ conn, deposit: { ...locked, verifiedBy: user.id }, before, after });
    await depositModel.markCredited(conn, id);
    await depositModel.updateStatus(conn, id, 'selesai', { paymentMethod });
    return { alreadyCompleted: false, amount, balanceAfter: after, paymentMethod };
  });

  await activity.log({
    userId: user.id,
    action: outcome.alreadyCompleted ? 'deposit.complete.skipped' : 'deposit.complete',
    entity: 'deposit',
    entityId: id,
    description: outcome.alreadyCompleted
      ? 'Permintaan penyelesaian diulang; saldo tidak ditambahkan lagi'
      : `Menyelesaikan setoran dan menambah saldo ${outcome.amount}`,
  });
  return { ...(await getDeposit(user, id)), alreadyCompleted: outcome.alreadyCompleted };
}

export async function cancelDeposit(user, id, reason) {
  await withTransaction(async (conn) => {
    const locked = await depositModel.lockById(conn, id);
    if (!locked) throw notFound('Setoran tidak ditemukan.');
    if (!canManageDeposit(user, locked)) throw forbidden('Anda tidak dapat membatalkan setoran ini.');
    if (!['menunggu', 'diverifikasi'].includes(locked.status)) {
      throw conflict(`Setoran berstatus "${locked.status}" tidak dapat dibatalkan.`);
    }
    await depositModel.updateStatus(conn, id, 'dibatalkan', { notes: reason });
  });
  await activity.log({
    userId: user.id, action: 'deposit.cancel', entity: 'deposit', entityId: id,
    description: reason ? `Membatalkan setoran: ${reason}` : 'Membatalkan setoran',
  });
  return getDeposit(user, id);
}

export async function getAttachment(user, attachmentId) {
  const attachment = await depositModel.findAttachmentById(attachmentId);
  if (!attachment) throw notFound('Lampiran tidak ditemukan.');
  const deposit = await depositModel.findById(attachment.depositId);
  if (!deposit || !canAccessDeposit(user, deposit)) {
    throw forbidden('Anda tidak memiliki akses ke lampiran ini.');
  }
  return attachment;
}
