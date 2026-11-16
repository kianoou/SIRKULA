import './styles.css';
import { api, errorMessage } from './api.js';
import { state, loadSession, loadPublicInfo, whatsAppUrl } from './state.js';
import { initModal, esc, initial, loadingState, toast } from './ui.js';
import { renderPublicNav, renderPublicFooter } from './views/publicLayout.js';
import landingView from './views/landing.js';
import catalogView from './views/catalog.js';
import aboutView from './views/about.js';
import loginView from './views/login.js';
import registerView from './views/register.js';
import dashboardView from './views/dashboard.js';
import depositsView from './views/deposits.js';
import categoriesView from './views/categories.js';
import customersView from './views/customers.js';
import usersView from './views/users.js';
import reportsView from './views/reports.js';
import settingsView from './views/settings.js';
import activityView from './views/activity.js';
import bankView from './views/bank.js';
import profileView from './views/profile.js';

const NAV_BY_ROLE = {
  admin: [
    ['/dashboard', 'Dashboard', '▦'],
    ['/setoran', 'Setoran Sampah', '＋'],
    ['/kategori', 'Kategori Sampah', '♻'],
    ['/pengguna', 'Pengguna', '♙'],
    ['/laporan', 'Laporan', '◷'],
    ['/aktivitas', 'Aktivitas', '≡'],
    ['/pengaturan', 'Pengaturan', '⚙'],
    ['/profil', 'Profil Saya', '☺'],
  ],
  seller: [
    ['/dashboard', 'Dashboard', '▦'],
    ['/setoran', 'Setoran Sampah', '＋'],
    ['/nasabah', 'Data Nasabah', '♙'],
    ['/kategori', 'Kategori Sampah', '♻'],
    ['/riwayat', 'Riwayat Transaksi', '◷'],
    ['/laporan', 'Laporan', '≡'],
    ['/bank', 'Bank Sampah', '⌂'],
    ['/profil', 'Profil Saya', '☺'],
  ],
  pembeli: [
    ['/dashboard', 'Dashboard', '▦'],
    ['/setoran', 'Setoran Sampah', '＋'],
    ['/riwayat', 'Riwayat Transaksi', '◷'],
    ['/saldo', 'Riwayat Saldo', '↗'],
    ['/profil', 'Profil Saya', '☺'],
  ],
};

const ROUTES = {
  '/': { view: landingView, public: true, title: 'SIRKULA' },
  '/katalog': { view: catalogView, public: true, title: 'Katalog Sampah' },
  '/tentang': { view: aboutView, public: true, title: 'Tentang SIRKULA' },
  '/masuk': { view: loginView, public: true, guestOnly: true, title: 'Masuk' },
  '/daftar': { view: registerView, public: true, guestOnly: true, title: 'Daftar' },
  '/dashboard': { view: dashboardView, auth: true, title: 'Dashboard' },
  '/setoran': { view: depositsView, auth: true, title: 'Setoran Sampah' },
  '/riwayat': { view: depositsView, auth: true, title: 'Riwayat Transaksi', mode: 'history' },
  '/kategori': { view: categoriesView, auth: true, roles: ['admin', 'seller'], title: 'Kategori Sampah' },
  '/nasabah': { view: customersView, auth: true, roles: ['admin', 'seller'], title: 'Data Nasabah' },
  '/pengguna': { view: usersView, auth: true, roles: ['admin'], title: 'Pengguna' },
  '/laporan': { view: reportsView, auth: true, roles: ['admin', 'seller'], title: 'Laporan' },
  '/pengaturan': { view: settingsView, auth: true, roles: ['admin'], title: 'Pengaturan' },
  '/aktivitas': { view: activityView, auth: true, roles: ['admin'], title: 'Aktivitas Sistem' },
  '/bank': { view: bankView, auth: true, roles: ['admin', 'seller'], title: 'Bank Sampah' },
  '/profil': { view: profileView, auth: true, title: 'Profil Saya' },
  '/saldo': { view: profileView, auth: true, roles: ['pembeli'], title: 'Riwayat Saldo', mode: 'balance' },
};

const appRoot = document.getElementById('app');
export let currentPath = '/';

export function navigate(path) {
  if (window.location.hash === `#${path}`) render();
  else window.location.hash = `#${path}`;
}

export async function refreshUser() {
  await loadSession();
  return state.user;
}

function renderShell(route) {
  const user = state.user;
  const nav = NAV_BY_ROLE[user.role] || NAV_BY_ROLE.pembeli;
  const waNumber = user.role === 'pembeli' ? state.settings?.whatsappPengelola : (user.whatsapp || '');
  const waLink = whatsAppUrl(waNumber, 'Halo, saya ingin bertanya mengenai setoran sampah di SIRKULA.');

  appRoot.innerHTML = `
    <div class="app">
      <aside class="sidebar">
        <a class="brand" href="#/dashboard">
          <span class="brand-mark">↻</span>
          <span><strong>SIRKULA</strong><small>BANK SAMPAH DIGITAL</small></span>
        </a>
        <div class="nav-label">MENU UTAMA</div>
        <nav class="nav" id="sideNav">
          ${nav
            .map(
              ([path, label, icon]) =>
                `<a href="#${path}" class="${path === currentPath ? 'active' : ''}"><span class="ico">${icon}</span>${esc(label)}</a>`,
            )
            .join('')}
        </nav>
        <div class="sidebar-note">
          <b>${esc(roleLabel(user.role))}</b>
          ${user.role === 'admin'
            ? 'Akses penuh pengelolaan pengguna, katalog, dan transaksi.'
            : user.role === 'seller'
              ? 'Kelola setoran, penimbangan, saldo nasabah, dan laporan bank sampah Anda.'
              : 'Ajukan setoran sampah dan pantau status serta saldo Anda.'}
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div>
            <div class="crumb">SIRKULA / <span id="crumbText">${esc(route.title)}</span></div>
            <h2 id="topTitle">${esc(route.title)}</h2>
          </div>
          <div class="top-actions">
            ${
              waLink
                ? `<a class="wa-admin" href="${waLink}" target="_blank" rel="noopener" title="Hubungi via WhatsApp">◉ <span>WhatsApp</span></a>`
                : ''
            }
            <div class="user">
              <div class="avatar">${initial(user.name)}</div>
              <div><b>${esc(user.name)}</b><small>${esc(roleLabel(user.role))}</small></div>
            </div>
            <button class="btn small" id="logoutBtn" title="Keluar dari aplikasi">Keluar</button>
          </div>
        </header>
        <section class="content" id="view"></section>
      </main>
    </div>`;

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await api.post('/auth/logout');
    state.user = null;
    toast('Anda telah keluar.');
    navigate('/');
  });

  return document.getElementById('view');
}

function roleLabel(role) {
  return { admin: 'Administrator', seller: 'Pengelola Bank Sampah', pembeli: 'Nasabah' }[role] || role;
}

async function render() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart] = raw.split('?');
  const path = pathPart.replace(/\/+$/, '') || '/';
  currentPath = path;
  const route = ROUTES[path];
  const params = new URLSearchParams(queryPart || '');

  if (!route) {
    navigate(state.user ? '/dashboard' : '/');
    return;
  }

  if (route.auth && !state.user) {
    window.location.hash = `#/masuk?next=${encodeURIComponent(path)}`;
    return;
  }
  if (route.guestOnly && state.user) {
    navigate('/dashboard');
    return;
  }
  if (route.roles && !route.roles.includes(state.user?.role)) {
    toast('Halaman ini tidak tersedia untuk role Anda.', 'error');
    navigate('/dashboard');
    return;
  }

  if (route.public) {
    appRoot.innerHTML = `${renderPublicNav(path)}<main class="public-main" id="view"></main>${renderPublicFooter()}`;
    document.title = `${route.title} — SIRKULA`;
  } else {
    document.title = `${route.title} — SIRKULA`;
  }

  const container = route.public ? document.getElementById('view') : renderShell(route);
  if (!container) return;
  container.innerHTML = loadingState();

  try {
    await route.view.render(container, { path, params, mode: route.mode });
  } catch (error) {
    console.error(error);
    container.innerHTML = `<div class="panel"><div class="alert">${esc(errorMessage(error))}</div>
      <button class="btn" onclick="location.reload()">Muat ulang halaman</button></div>`;
  }
}

async function boot() {
  initModal();
  await Promise.all([loadSession(), loadPublicInfo()]);
  window.addEventListener('hashchange', render);
  await render();
}

// Ekspos navigasi untuk dipakai pada atribut HTML sederhana.
window.sirkula = { navigate, refreshUser, render };

boot();
