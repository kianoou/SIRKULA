import { api, errorMessage } from '../api.js';
import { dateFmt, emptyState, esc, kg, loadingState, money, toast, todayISO } from '../ui.js';

const firstDayOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};

export default {
  render: async (container) => {
    let dateFrom = firstDayOfMonth();
    let dateTo = todayISO();
    let data = null;

    container.innerHTML = `
      <div class="page-head">
        <div><h1>Laporan</h1><p>Rekap setoran berdasarkan kategori dan periode.</p></div>
        <div class="head-actions"><button class="btn" id="printReport">Cetak Laporan</button></div>
      </div>
      <div class="panel">
        <div class="toolbar">
          <input class="field-select" type="date" id="reportFrom" value="${dateFrom}" aria-label="Dari tanggal" />
          <span class="muted small">s/d</span>
          <input class="field-select" type="date" id="reportTo" value="${dateTo}" aria-label="Sampai tanggal" />
          <button class="btn primary small" id="applyRange">Terapkan</button>
          <button class="btn small" data-range="month">Bulan ini</button>
          <button class="btn small" data-range="year">Tahun ini</button>
        </div>
        <div id="reportBody">${loadingState()}</div>
      </div>`;

    const body = container.querySelector('#reportBody');
    const fromInput = container.querySelector('#reportFrom');
    const toInput = container.querySelector('#reportTo');

    async function load() {
      body.innerHTML = loadingState('Menghitung laporan...');
      try {
        const params = new URLSearchParams();
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);
        const response = await api.get(`/reports?${params.toString()}`);
        data = response.data;
        render();
      } catch (error) {
        body.innerHTML = `<div class="alert">${esc(errorMessage(error))}</div>`;
      }
    }

    function render() {
      const summary = data.summary;
      const totalWeight = data.byCategory.reduce((sum, row) => sum + row.weight, 0);
      body.innerHTML = `
        <div class="stats" style="margin-top:4px">
          <article class="stat"><div class="stat-top"><span>Setoran selesai</span><span class="stat-icon">✓</span></div>
            <strong>${summary.completed}</strong><small>dari ${summary.totalDeposits} pengajuan</small></article>
          <article class="stat"><div class="stat-top"><span>Nilai transaksi</span><span class="stat-icon">◈</span></div>
            <strong class="money">${money(summary.totalValue)}</strong><small>nilai setoran selesai</small></article>
          <article class="stat"><div class="stat-top"><span>Berat aktual</span><span class="stat-icon">⚖</span></div>
            <strong>${kg(summary.totalWeight)}</strong><small>akumulasi berat</small></article>
          <article class="stat"><div class="stat-top"><span>Menunggu verifikasi</span><span class="stat-icon">◷</span></div>
            <strong>${summary.pending}</strong><small>${summary.verified} sudah diverifikasi</small></article>
        </div>

        <div class="grid-two">
          <div class="panel" style="box-shadow:none">
            <div class="panel-head"><h3>Rekap per jenis sampah</h3><span>${data.range.dateFrom ? dateFmt(data.range.dateFrom) : 'awal'} – ${data.range.dateTo ? dateFmt(data.range.dateTo) : 'sekarang'}</span></div>
            ${
              data.byCategory.length
                ? `<div class="table-wrap"><table>
                    <thead><tr><th>Kategori</th><th>Jenis sampah</th><th>Transaksi</th><th>Berat</th><th>Nilai</th></tr></thead>
                    <tbody>
                      ${data.byCategory
                        .map(
                          (row) => `<tr>
                            <td><span class="category-chip">${esc(row.categoryName)}</span></td>
                            <td class="cell-title">${esc(row.wasteName)}</td>
                            <td>${row.depositCount}</td>
                            <td>${kg(row.weight)}</td>
                            <td><b>${money(row.value)}</b></td>
                          </tr>`,
                        )
                        .join('')}
                    </tbody>
                    <tfoot><tr><th colspan="3">Total</th><th>${kg(totalWeight)}</th><th>${money(summary.totalValue)}</th></tr></tfoot>
                  </table></div>`
                : emptyState('Belum ada data pada rentang ini', 'Coba ubah rentang tanggal.')
            }
          </div>

          <div class="panel" style="box-shadow:none">
            <div class="panel-head"><h3>Rekap per periode</h3><span>per bulan</span></div>
            ${
              data.byPeriod.length
                ? `<div class="table-wrap"><table>
                    <thead><tr><th>Periode</th><th>Transaksi</th><th>Nilai</th></tr></thead>
                    <tbody>
                      ${data.byPeriod
                        .map(
                          (row) => `<tr><td class="cell-title">${esc(row.period)}</td><td>${row.depositCount}</td><td><b>${money(row.value)}</b></td></tr>`,
                        )
                        .join('')}
                    </tbody>
                  </table></div>`
                : emptyState('Belum ada transaksi selesai')
            }
            <div class="notice" style="margin-top:14px;margin-bottom:0">
              Laporan hanya menghitung setoran berstatus <b>selesai</b>. Setoran menunggu atau dibatalkan tidak masuk nilai transaksi.
            </div>
          </div>
        </div>`;
    }

    const apply = () => {
      dateFrom = fromInput.value;
      dateTo = toInput.value;
      if (dateFrom && dateTo && dateFrom > dateTo) {
        toast('Tanggal awal tidak boleh melebihi tanggal akhir.', 'error');
        return;
      }
      load();
    };
    container.querySelector('#applyRange').addEventListener('click', apply);
    fromInput.addEventListener('change', apply);
    toInput.addEventListener('change', apply);

    container.querySelectorAll('[data-range]').forEach((button) => {
      button.addEventListener('click', () => {
        const now = new Date();
        if (button.dataset.range === 'month') {
          dateFrom = firstDayOfMonth();
          dateTo = todayISO();
        } else {
          dateFrom = `${now.getFullYear()}-01-01`;
          dateTo = todayISO();
        }
        fromInput.value = dateFrom;
        toInput.value = dateTo;
        load();
      });
    });

    container.querySelector('#printReport').addEventListener('click', () => {
      if (!data) return;
      const win = window.open('', '_blank');
      if (!win) {
        toast('Popup diblokir browser.', 'error');
        return;
      }
      win.document.write(`<html><head><title>Laporan SIRKULA</title>
        <style>body{font-family:sans-serif;padding:24px;color:#173b30}h1{font-size:18px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px}
        th,td{border-bottom:1px solid #ddd;padding:7px;text-align:left}</style></head><body>
        <h1>Laporan Bank Sampah SIRKULA</h1>
        <p>Periode: ${dateFmt(dateFrom)} – ${dateFmt(dateTo)} · Dicetak ${new Date().toLocaleString('id-ID')}</p>
        <p><b>Total setoran selesai:</b> ${data.summary.completed} · <b>Nilai:</b> ${money(data.summary.totalValue)} · <b>Berat:</b> ${kg(data.summary.totalWeight)}</p>
        <table><thead><tr><th>Kategori</th><th>Jenis</th><th>Transaksi</th><th>Berat</th><th>Nilai</th></tr></thead><tbody>
        ${data.byCategory.map((row) => `<tr><td>${esc(row.categoryName)}</td><td>${esc(row.wasteName)}</td><td>${row.depositCount}</td><td>${kg(row.weight)}</td><td>${money(row.value)}</td></tr>`).join('')}
        </tbody></table>
        <table><thead><tr><th>Periode</th><th>Transaksi</th><th>Nilai</th></tr></thead><tbody>
        ${data.byPeriod.map((row) => `<tr><td>${esc(row.period)}</td><td>${row.depositCount}</td><td>${money(row.value)}</td></tr>`).join('')}
        </tbody></table></body></html>`);
      win.document.close();
      win.print();
    });

    await load();
  },
};
