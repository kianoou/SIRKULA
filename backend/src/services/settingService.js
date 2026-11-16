import * as settingModel from '../models/settingModel.js';
import * as activity from '../models/activityModel.js';
import { badRequest } from '../utils/httpError.js';
import { isValidWhatsApp, normalizeWhatsApp } from '../utils/whatsapp.js';

const ALLOWED_KEYS = ['app_name', 'app_tagline', 'whatsapp_pengelola', 'deposit_instructions'];

export async function getSettings() {
  const settings = await settingModel.getAll();
  return {
    appName: settings.app_name || 'SIRKULA',
    appTagline: settings.app_tagline || 'Bank Sampah Digital',
    whatsappPengelola: settings.whatsapp_pengelola || '',
    depositInstructions: settings.deposit_instructions || '',
  };
}

/** Pengaturan publik dibutuhkan halaman utama tanpa login. */
export async function getPublicSettings() {
  const { appName, appTagline, whatsappPengelola, depositInstructions } = await getSettings();
  return { appName, appTagline, whatsappPengelola, depositInstructions };
}

export async function updateSettings(actor, payload) {
  if (payload.whatsappPengelola !== undefined && payload.whatsappPengelola !== '') {
    if (!isValidWhatsApp(payload.whatsappPengelola)) throw badRequest('Nomor WhatsApp pengelola harus terdiri dari 9–15 digit.');
  }
  const entries = {};
  if (payload.appName !== undefined) entries.app_name = payload.appName.trim();
  if (payload.appTagline !== undefined) entries.app_tagline = payload.appTagline.trim();
  if (payload.whatsappPengelola !== undefined) {
    entries.whatsapp_pengelola = payload.whatsappPengelola
      ? normalizeWhatsApp(payload.whatsappPengelola)
      : '';
  }
  if (payload.depositInstructions !== undefined) entries.deposit_instructions = payload.depositInstructions;
  await settingModel.setMany(entries);
  await activity.log({
    userId: actor.id, action: 'settings.update', entity: 'app_settings',
    description: `Memperbarui pengaturan aplikasi: ${Object.keys(entries).join(', ') || 'tidak ada perubahan'}`,
  });
  return getSettings();
}
