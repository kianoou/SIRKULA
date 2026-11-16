export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

export const money = (value) => currency.format(Number(value) || 0);
export const kg = (value) => `${decimal.format(Number(value) || 0)} kg`;
export const dateFmt = (value) => {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(`${value.slice(0, 10)}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const dateTimeFmt = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
export const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUS_LABEL = {
  menunggu: 'Menunggu',
  diverifikasi: 'Diverifikasi',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

export const statusLabel = (status) => STATUS_LABEL[status] || status || '-';
export const statusBadge = (status) => `<span class="status ${esc(status)}">${esc(statusLabel(status))}</span>`;
export const roleChip = (role) => `<span class="role-chip ${esc(role)}">${esc(role)}</span>`;
export const initial = (name) => esc(String(name || 'S').trim().charAt(0).toUpperCase());

let toastTimer;
export function toast(message, type = 'success') {
  const element = document.getElementById('toast');
  if (!element) return;
  element.textContent = message;
  element.className = `toast show${type === 'error' ? ' error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 3200);
}

export function openModal(title, body, { wide = false } = {}) {
  const modal = document.getElementById('modal');
  const box = modal.querySelector('.modal');
  box.classList.toggle('wide', wide);
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  modal.classList.add('show');
}

export function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

export function initModal() {
  const modal = document.getElementById('modal');
  modal.addEventListener('click', (event) => {
    if (event.target === modal || event.target.closest('[data-close-modal]')) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
}

/** Dialog konfirmasi berbasis modal, mengembalikan Promise<boolean>. */
export function confirmDialog({ title = 'Konfirmasi', message, confirmLabel = 'Ya, lanjutkan', danger = false }) {
  return new Promise((resolve) => {
    openModal(
      title,
      `<p style="font-size:13px;color:#4b6656">${esc(message)}</p>
       <div class="modal-actions">
         <button class="btn" data-confirm="no">Batal</button>
         <button class="btn ${danger ? 'danger' : 'primary'}" data-confirm="yes">${esc(confirmLabel)}</button>
       </div>`,
    );
    const body = document.getElementById('modalBody');
    body.querySelectorAll('[data-confirm]').forEach((button) => {
      button.addEventListener('click', () => {
        closeModal();
        resolve(button.dataset.confirm === 'yes');
      });
    });
  });
}

export const loadingState = (label = 'Memuat data...') =>
  `<div class="panel skeleton" aria-label="${esc(label)}"><div></div><div></div><div></div></div>`;

export const emptyState = (title, description = '') =>
  `<div class="empty"><b>${esc(title)}</b>${esc(description)}</div>`;

export function pageHead(title, subtitle, actions = '') {
  return `<div class="page-head"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${
    actions ? `<div class="head-actions">${actions}</div>` : ''
  }</div>`;
}

export function pager(total, limit, offset) {
  if (total <= limit) return `<div class="pager"><span>${total} data</span></div>`;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(total / limit);
  return `<div class="pager">
    <span>Menampilkan ${offset + 1}–${Math.min(offset + limit, total)} dari ${total} data</span>
    <div class="pages">
      <button class="btn small" data-page-prev ${page <= 1 ? 'disabled' : ''}>‹ Sebelumnya</button>
      <span class="btn small" style="pointer-events:none">${page} / ${pages}</span>
      <button class="btn small" data-page-next ${page >= pages ? 'disabled' : ''}>Berikutnya ›</button>
    </div>
  </div>`;
}

/** Membaca file menjadi base64 hanya untuk pratinjau (data tidak disimpan di browser). */
export function fileSize(bytes) {
  const value = Number(bytes) || 0;
  return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(2)} MB` : `${Math.max(1, Math.round(value / 1024))} KB`;
}

export const categoryIcon = (icon) => esc(icon || '♻');
