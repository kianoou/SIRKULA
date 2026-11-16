import { state, whatsAppUrl } from '../state.js';
import { esc } from '../ui.js';

const LINKS = [
  ['/', 'Beranda'],
  ['/katalog', 'Katalog Sampah'],
  ['/tentang', 'Cara Setor'],
];

export function renderPublicNav(path = '/') {
  const appName = state.settings?.appName || 'SIRKULA';
  return `
    <header class="public-nav">
      <a class="brand" href="#/">
        <span class="brand-mark">↻</span>
        <span><strong>${esc(appName)}</strong><small>BANK SAMPAH DIGITAL</small></span>
      </a>
      <nav class="public-links">
        ${LINKS.map(
          ([href, label]) =>
            `<a href="#${href}" class="${path === href ? 'active' : ''}">${esc(label)}</a>`,
        ).join('')}
        ${
          state.user
            ? `<a class="btn small primary" href="#/dashboard">Buka Dashboard</a>`
            : `<a href="#/masuk" class="${path === '/masuk' ? 'active' : ''}">Masuk</a>
               <a class="btn small primary" href="#/daftar">Daftar Nasabah</a>`
        }
      </nav>
    </header>`;
}

export function renderPublicFooter() {
  const appName = state.settings?.appName || 'SIRKULA';
  const wa = whatsAppUrl(
    state.settings?.whatsappPengelola,
    'Halo, saya ingin bertanya mengenai setoran sampah di SIRKULA.',
  );
  return `
    <footer class="public-footer">
      <span>© ${new Date().getFullYear()} ${esc(appName)} — ${esc(state.settings?.appTagline || 'Bank Sampah Digital')}</span>
      <span>
        ${wa ? `<a class="wa-link" href="${wa}" target="_blank" rel="noopener">◉ WhatsApp Pengelola</a>` : 'Kelola sampah, tumbuhkan manfaat.'}
      </span>
    </footer>`;
}
