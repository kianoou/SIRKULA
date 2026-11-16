import * as wasteModel from '../models/wasteModel.js';
import * as activity from '../models/activityModel.js';
import { conflict, notFound } from '../utils/httpError.js';

export async function listCategories(filters) {
  return wasteModel.listCategories(filters);
}

export async function createCategory(actor, payload) {
  if (await wasteModel.findCategoryByName(payload.name)) throw conflict('Nama kategori sudah digunakan.');
  const category = await wasteModel.createCategory({
    name: payload.name.trim(),
    icon: payload.icon,
    description: payload.description,
    createdBy: actor.id,
  });
  await activity.log({
    userId: actor.id, action: 'waste_category.create', entity: 'waste_category', entityId: category.id,
    description: `Menambah kategori ${category.name}`,
  });
  return category;
}

export async function updateCategory(actor, id, payload) {
  const category = await wasteModel.findCategory(id);
  if (!category) throw notFound('Kategori tidak ditemukan.');
  if (await wasteModel.findCategoryByName(payload.name, id)) throw conflict('Nama kategori sudah digunakan.');
  const updated = await wasteModel.updateCategory(id, {
    ...payload,
    isActive: payload.isActive ?? Boolean(category.isActive),
  });
  await activity.log({
    userId: actor.id, action: 'waste_category.update', entity: 'waste_category', entityId: id,
    description: `Memperbarui kategori ${updated.name}`,
  });
  return updated;
}

export async function deleteCategory(actor, id) {
  const category = await wasteModel.findCategory(id);
  if (!category) throw notFound('Kategori tidak ditemukan.');
  const usage = await wasteModel.categoryUsage(id);
  if (usage.depositCount > 0) {
    throw conflict('Kategori sudah digunakan pada transaksi. Nonaktifkan kategori sebagai gantinya.');
  }
  if (usage.typeCount > 0) {
    throw conflict('Kategori masih memiliki jenis sampah. Hapus jenis sampah terlebih dahulu.');
  }
  await wasteModel.deleteCategory(id);
  await activity.log({
    userId: actor.id, action: 'waste_category.delete', entity: 'waste_category', entityId: id,
    description: `Menghapus kategori ${category.name}`,
  });
}

export async function listTypes(filters) {
  return wasteModel.listTypes(filters);
}

export async function createType(actor, payload) {
  const category = await wasteModel.findCategory(payload.categoryId);
  if (!category) throw notFound('Kategori tidak ditemukan.');
  if (await wasteModel.findTypeByName(payload.categoryId, payload.name)) {
    throw conflict('Jenis sampah dengan nama tersebut sudah ada pada kategori ini.');
  }
  const type = await wasteModel.createType({
    categoryId: payload.categoryId,
    name: payload.name.trim(),
    pricePerKg: payload.pricePerKg,
    unit: payload.unit,
    description: payload.description,
    createdBy: actor.id,
  });
  await activity.log({
    userId: actor.id, action: 'waste_type.create', entity: 'waste_type', entityId: type.id,
    description: `Menambah jenis sampah ${type.name}`,
  });
  return type;
}

export async function updateType(actor, id, payload) {
  const existing = await wasteModel.findType(id);
  if (!existing) throw notFound('Jenis sampah tidak ditemukan.');
  const category = await wasteModel.findCategory(payload.categoryId);
  if (!category) throw notFound('Kategori tidak ditemukan.');
  if (await wasteModel.findTypeByName(payload.categoryId, payload.name, id)) {
    throw conflict('Jenis sampah dengan nama tersebut sudah ada pada kategori ini.');
  }
  const updated = await wasteModel.updateType(id, {
    ...payload,
    isActive: payload.isActive ?? Boolean(existing.isActive),
  });
  await activity.log({
    userId: actor.id, action: 'waste_type.update', entity: 'waste_type', entityId: id,
    description: `Memperbarui jenis sampah ${updated.name} (${updated.pricePerKg}/kg)`,
  });
  return updated;
}

export async function deleteType(actor, id) {
  const existing = await wasteModel.findType(id);
  if (!existing) throw notFound('Jenis sampah tidak ditemukan.');
  if ((await wasteModel.typeUsage(id)) > 0) {
    throw conflict('Jenis sampah sudah digunakan pada transaksi. Nonaktifkan sebagai gantinya.');
  }
  await wasteModel.deleteType(id);
  await activity.log({
    userId: actor.id, action: 'waste_type.delete', entity: 'waste_type', entityId: id,
    description: `Menghapus jenis sampah ${existing.name}`,
  });
}
