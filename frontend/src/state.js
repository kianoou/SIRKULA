import { api } from './api.js';

export const state = {
  user: null,
  settings: null,
  banks: [],
  categories: [],
  types: [],
  loadedAt: 0,
  catalogLoadedAt: 0,
};

export async function loadSession() {
  try {
    const response = await api.get('/auth/me');
    state.user = response.data.user;
  } catch {
    state.user = null;
  }
  return state.user;
}

export async function loadPublicInfo({ force = false } = {}) {
  if (!force && state.settings && Date.now() - state.loadedAt < 60_000) return state;
  try {
    const response = await api.get('/public/info');
    state.settings = response.data.settings;
    state.banks = response.data.banks;
    state.loadedAt = Date.now();
  } catch {
    state.settings = state.settings || { appName: 'SIRKULA', appTagline: 'Bank Sampah Digital', whatsappPengelola: '', depositInstructions: '' };
  }
  return state;
}

export async function loadCatalog({ force = false } = {}) {
  if (!force && state.catalogLoadedAt && Date.now() - state.catalogLoadedAt < 30_000) return state;
  const [categories, types] = await Promise.all([api.get('/categories'), api.get('/waste-types')]);
  state.categories = categories.data;
  state.types = types.data;
  state.catalogLoadedAt = Date.now();
  return state;
}

export function whatsAppUrl(number, message) {
  if (!number) return '';
  const digits = String(number).replace(/\D/g, '').replace(/^0/, '62');
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const homePathFor = (user) =>
  !user ? '#/' : '#/dashboard';
