import { api, errorMessage } from '../api.js';
import { state, whatsAppUrl } from '../state.js';
import {
  dateFmt,
  dateTimeFmt,
  emptyState,
  esc,
  initial,
  kg,
  loadingState,
  money,
  statusBadge,
  toast,
} from '../ui.js';
import { bindDepositRows, depositRows, openDepositDetail } from './depositShared.js';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
};

function statCard(label, value, icon, sub = '', moneyStyle = false) {
  return `<article class="stat">
    <div class="stat-top"><span>${esc(label)}</span><span class="stat-icon">${icon}</span></div>
    <strong class="${moneyStyle ? 'money' : ''}">${value}</strong>
    <small>${esc(sub)}</small>
  </article>`;
}

function compositionPanel(composition) {
  if (!composition?.length) {
    return `<div class="panel"><div class="panel-head"><h3>Komposisi sampah selesai</h3></div>
      ${emptyState('Belum ada setoran selesai', 'Komposisi muncul setelah setoran pertama diselesaikan.')}</div>`;
  }
  const max = Math.max(...composition.map((row) => Number(row.weight) || 0), 1);
  return `<div class="panel">
    <div class="panel-head"><h3>Komposisi sampah selesai</h3><span>berdasarkan berat aktual</span></div>
    ${composition
      .map(
        (row) => `
      <div class="bar-row">
        <span title="${esc(row.categoryName)}">${esc(row.icon || '♻')} ${esc(row.categoryName)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, ((Number(row.weight) || 0) / max) * 100)}%"></div></div>
        <b>${kg(row.weight)}</b>
      </div>`,
      )
      .join('')}
    <div class="legend"><span><span class="dot" style="background:#26966b"></span>Berat aktual per kategori</span></div>
  </div>`;
}

function recentTable(deposits, options, onChange) {
  if (!deposits?.length) {
    return `<div class="panel"><div class="panel-head"><h3>Setoran terbaru</h3></div>
      ${emptyState('Belum ada setoran', 'Setoran yang diajukan akan tampil di sini.')}</div>`;
  }
  return `<div class="panel" id="recentPanel">
    <div class="panel-head"><h3>Setoran terbaru</h3><span>${deposits.length} data</span></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Kode</th>${options.showBuyer ? '<th>Nasabah</th>' : ''}<th>Tanggal</th><th>Berat</th><th>Nilai</th><th>Status</th><th></th></tr></thead>
        <tbody>${depositRows(deposits, options)}</tbody>
      </table>
    </div>
  </div>`;
}

export default {
  render: async (container) => {
    container.innerHTML = loadingState('Memuat dashboard...');
    let data;
    try {
      const response = await api.get('/dashboard');
      data = response.data;
    } catch (error) {
      container.innerHTML = `<div class="panel"><div class="alert">${esc(errorMessage(error))}</div></div>`;
      return;
    }

    const user = state.user;
    const stats = data.stats;
    const reload = async () => {
      const element = document.getElementById('view');
      if (element) await module.render(element);
    };
    const showBuyer = user.role === 'admin';
    const waNumber =
      user.role === 'pembeli' ? state.settings?.whatsappPengelola : data.bankProfile?.whatsapp || user.whatsapp;
    const wa = whatsAppUrl(waNumber, `Halo, saya ${user.name} dari SIRKULA.`);

    const cards = {
      pembeli: [
        statCard('Saldo Anda', money(stats.balance), '◈', 'saldo dapat dicairkan via pengelola', true),
        statCard('Total setoran', stats.totalDeposits, '↻', `${stats.completed} selesai`),
        statCard('Berat disetor', kg(stats.totalWeight), '⚖', 'akumulasi berat aktual'),
        statCard('Menunggu verifikasi', stats.pending, '◷', 'setoran dalam antrean'),
      ],
      seller: [
        statCard('Nasabah terdaftar', stats.totalCustomers, '♙', 'nasabah bank sampah Anda'),
        statCard('Setoran masuk', stats.totalDeposits, '↻', `${stats.pending} menunggu verifikasi`),
        statCard('Nilai setoran selesai', money(stats.totalValue), '◈', `${stats.completed} setoran selesai`, true),
        statCard('Saldo nasabah', money(stats.totalBalance), '▤', 'total kewajiban saldo', true),
      ],
      admin: [
        statCard('Pengguna aktif', stats.activeUsers, '♙', `dari ${stats.totalUsers} pengguna terdaftar`),
        statCard('Total setoran', stats.totalDeposits, '↻', `${stats.pending} menunggu · ${stats.verified} diverifikasi`),
        statCard('Berat aktual tercatat', kg(stats.totalWeight), '⚖', `${stats.completed} setoran selesai`),
        statCard('Nilai transaksi', money(stats.totalValue), '◈', `${stats.bankCount} bank sampah mitra`, true),
      ],
    }[user.role];

    const description = {
      pembeli: 'Pantau saldo dan status setoran sampah Anda.',
      seller: 'Kelola antrean verifikasi, nasabah, dan laporan bank sampah Anda.',
      admin: 'Ringkasan seluruh aktivitas bank sampah digital SIRKULA.',
    }[user.role];

    container.innerHTML = `
      <section class="welcome-banner">
        <div class="welcome-copy">
          <span class="welcome-eyebrow">◉ ${greeting()}, ${esc(user.name.split(' ')[0])}</span>
          <h2>${user.role === 'pembeli' ? 'Setoran Anda hari ini' : 'Operasional bank sampah hari ini'}</h2>
          <p>${esc(description)}</p>
          <div class="welcome-actions" style="margin-top:14px">
            ${
              user.role === 'pembeli'
                ? '<a class="btn primary" href="#/setoran">Ajukan Setoran</a><a class="btn ghost" href="#/saldo">Riwayat Saldo</a>'
                : '<a class="btn primary" href="#/setoran">Lihat Antrean Setoran</a>'
            }
            ${wa ? `<a class="btn ghost" href="${wa}" target="_blank" rel="noopener">◉ WhatsApp</a>` : ''}
          </div>
        </div>
        <div class="welcome-actions">
          <a class="btn light" href="${user.role === 'pembeli' ? '#/riwayat' : '#/laporan'}">${
            user.role === 'pembeli' ? 'Lihat Riwayat' : 'Buka Laporan'
          }</a>
        </div>
      </section>

      <div class="stats">${cards.join('')}</div>

      <div class="grid-two">
        ${recentTable(data.recentDeposits, { showBuyer }, reload)}
        <div>
          ${compositionPanel(data.composition)}
          ${
            user.role === 'pembeli'
              ? `<div class="panel">
                  <div class="panel-head"><h3>Riwayat saldo terakhir</h3><span><a href="#/saldo">Lihat semua</a></span></div>
                  ${(data.recentBalance || []).length
                    ? data.recentBalance
                        .map(
                          (row) => `<div class="summary-line">
                            <span>${esc(row.description || 'Saldo diperbarui')}<br /><small>${dateTimeFmt(row.createdAt)}</small></span>
                            <b style="color:#1c7a4f">+${money(row.amount)}</b>
                          </div>`,
                        )
                        .join('')
                    : '<p class="muted small" style="margin:0">Belum ada perubahan saldo.</p>'}
                </div>`
              : `<div class="panel">
                  <div class="panel-head"><h3>${user.role === 'admin' ? 'Aktivitas terbaru' : 'Bank sampah saya'}</h3></div>
                  ${
                    user.role === 'admin'
                      ? (data.recentActivity || []).length
                        ? data.recentActivity
                            .map(
                              (log) => `<div class="summary-line">
                                <span>${esc(log.user_name || 'Sistem')}<br /><small>${esc(log.description || log.action)}</small></span>
                                <b style="font-weight:600;font-size:10.5px;color:#8a9a90">${dateTimeFmt(log.created_at || log.createdAt)}</b>
                              </div>`,
                            )
                            .join('')
                        : '<p class="muted small" style="margin:0">Belum ada aktivitas.</p>'
                      : data.bankProfile
                        ? `<div class="summary-line"><span>Nama bank sampah</span><b>${esc(data.bankProfile.name)}</b></div>
                           <div class="summary-line"><span>WhatsApp</span><b>${esc(data.bankProfile.whatsapp || '-')}</b></div>
                           <div class="summary-line"><span>Alamat</span><b style="font-weight:600;max-width:55%">${esc(data.bankProfile.address || '-')}</b></div>
                           <div class="summary-line"><span>Jam operasional</span><b>${esc(data.bankProfile.openingHours || '-')}</b></div>
                           <div class="modal-actions"><a class="btn small" href="#/bank">Kelola Profil Bank</a></div>`
                        : `<p class="muted small" style="margin:0 0 10px">Profil bank sampah belum diisi.</p>
                           <a class="btn small primary" href="#/bank">Lengkapi Profil</a>`
                  }
                </div>`
          }
        </div>
      </div>

      ${
        user.role === 'pembeli'
          ? `<div class="panel">
              <div class="panel-head"><h3>Butuh bantuan?</h3></div>
              <p class="muted small">Hubungi pengelola SIRKULA untuk penjadwalan penimbangan atau pencairan saldo${
                wa ? '' : ' (nomor WhatsApp pengelola belum diatur)'
              }.</p>
              ${wa ? `<a class="wa-link" href="${wa}" target="_blank" rel="noopener">◉ Chat Pengelola</a>` : ''}
            </div>`
          : ''
      }`;

    const recentPanel = container.querySelector('#recentPanel');
    if (recentPanel && data.recentDeposits?.length) {
      bindDepositRows(recentPanel, data.recentDeposits, { onChange: reload });
    }
  },
};

export { initial, dateFmt, toast, openDepositDetail, statusBadge };
