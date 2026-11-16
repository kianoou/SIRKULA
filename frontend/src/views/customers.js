import { api, errorMessage } from '../api.js';
import { whatsAppUrl } from '../state.js';
import {
  dateFmt,
  dateTimeFmt,
  emptyState,
  esc,
  initial,
  kg,
  loadingState,
  money,
  openModal,
  pager,
  toast,
} from '../ui.js';

export default {
  render: async (container) => {
    container.innerHTML = loadingState('Memuat data nasabah...');
    const filters = { search: '', limit: 20, offset: 0 };
    let rows = [];
    let total = 0;

    container.innerHTML = `
      <div class="page-head">
        <div><h1>Data Nasabah</h1><p>Nasabah yang pernah menyetor sampah ke bank sampah Anda.</p></div>
        <div class="head-actions"><button class="btn" id="exportCustomers">Cetak Daftar</button></div>
      </div>
      <div class="panel">
        <div class="toolbar">
          <div class="search"><input type="search" id="customerSearch" placeholder="Cari nama, email, atau WhatsApp" /></div>
        </div>
        <div id="customerList">${loadingState()}</div>
      </div>`;

    const list = container.querySelector('#customerList');

    async function load() {
      list.innerHTML = loadingState();
      try {
        const params = new URLSearchParams({ limit: filters.limit, offset: filters.offset });
        if (filters.search) params.set('search', filters.search);
        const response = await api.get(`/customers?${params.toString()}`);
        rows = response.data.rows || [];
        total = response.data.total || 0;
        list.innerHTML = rows.length
          ? `<div class="table-wrap"><table>
              <thead><tr><th>Nasabah</th><th>Kontak</th><th>Setoran</th><th>Nilai Selesai</th><th>Saldo</th><th>Setoran Terakhir</th><th></th></tr></thead>
              <tbody>
                ${rows
                  .map(
                    (customer) => `<tr>
                      <td><div class="person">
                        <div class="mini-avatar">${initial(customer.name)}</div>
                        <div><div class="cell-title">${esc(customer.name)}</div><small class="sub">${esc(customer.userType === 'umkm' ? 'UMKM' : 'Masyarakat')}</small></div>
                      </div></td>
                      <td><div class="small">${esc(customer.email)}</div><small class="sub">${esc(customer.whatsapp || '-')}</small></td>
                      <td>${Number(customer.depositCount)} setoran</td>
                      <td class="nowrap">${money(customer.totalValue)}</td>
                      <td class="nowrap"><b>${money(customer.balance)}</b></td>
                      <td>${customer.lastDepositDate ? dateFmt(customer.lastDepositDate) : '-'}</td>
                      <td><div class="row-actions">
                        <button class="btn small" data-detail="${customer.id}">Detail</button>
                        ${
                          whatsAppUrl(customer.whatsapp, `Halo ${customer.name}, ada informasi mengenai setoran sampah Anda di SIRKULA.`)
                            ? `<a class="wa-link" target="_blank" rel="noopener" href="${whatsAppUrl(customer.whatsapp, `Halo ${customer.name}, ada informasi mengenai setoran sampah Anda di SIRKULA.`)}">◉ WA</a>`
                            : ''
                        }
                      </div></td>
                    </tr>`,
                  )
                  .join('')}
              </tbody>
            </table></div>
            ${pager(total, filters.limit, filters.offset)}`
          : emptyState('Belum ada nasabah', 'Nasabah muncul setelah mereka menyetor sampah ke bank sampah Anda.');

        list.querySelectorAll('[data-detail]').forEach((button) => {
          button.addEventListener('click', () => openCustomer(rows.find((row) => row.id === Number(button.dataset.detail))));
        });
        list.querySelector('[data-page-prev]')?.addEventListener('click', () => {
          filters.offset = Math.max(0, filters.offset - filters.limit);
          load();
        });
        list.querySelector('[data-page-next]')?.addEventListener('click', () => {
          if (filters.offset + filters.limit < total) {
            filters.offset += filters.limit;
            load();
          }
        });
      } catch (error) {
        list.innerHTML = `<div class="alert">${esc(errorMessage(error))}</div>`;
      }
    }

    let debounce;
    container.querySelector('#customerSearch').addEventListener('input', (event) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        filters.search = event.target.value.trim();
        filters.offset = 0;
        load();
      }, 300);
    });

    container.querySelector('#exportCustomers').addEventListener('click', () => {
      const win = window.open('', '_blank');
      if (!win) {
        toast('Popup diblokir browser.', 'error');
        return;
      }
      win.document.write(`<html><head><title>Daftar Nasabah SIRKULA</title>
        <style>body{font-family:sans-serif;padding:24px;color:#173b30}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border-bottom:1px solid #ddd;padding:7px;text-align:left}</style>
        </head><body><h1>Daftar Nasabah Bank Sampah</h1><p>Dicetak ${new Date().toLocaleString('id-ID')}</p>
        <table><thead><tr><th>Nama</th><th>Email</th><th>WhatsApp</th><th>Setoran</th><th>Saldo</th></tr></thead><tbody>
        ${rows.map((row) => `<tr><td>${esc(row.name)}</td><td>${esc(row.email)}</td><td>${esc(row.whatsapp || '-')}</td><td>${row.depositCount}</td><td>${money(row.balance)}</td></tr>`).join('')}
        </tbody></table></body></html>`);
      win.document.close();
      win.print();
    });

    async function openCustomer(customer) {
      openModal(
        'Detail Nasabah',
        `<div class="panel-head"><div><h3 style="font-size:16px">${esc(customer.name)}</h3><span>${esc(customer.email)}</span></div><span class="role-chip pembeli">nasabah</span></div>
         <div class="summary-line"><span>WhatsApp</span><b>${esc(customer.whatsapp || '-')}</b></div>
         <div class="summary-line"><span>Jumlah setoran</span><b>${Number(customer.depositCount)} setoran</b></div>
         <div class="summary-line"><span>Nilai setoran selesai</span><b>${money(customer.totalValue)}</b></div>
         <div class="summary-line total"><span>Saldo saat ini</span><b>${money(customer.balance)}</b></div>
         <div class="panel-head" style="margin:14px 0 4px"><h3 style="font-size:12.5px">Riwayat saldo</h3></div>
         <div id="customerBalance">${loadingState()}</div>
         <div class="modal-actions">
           ${
             whatsAppUrl(customer.whatsapp, `Halo ${customer.name}, ada informasi mengenai setoran sampah Anda di SIRKULA.`)
               ? `<a class="btn primary" target="_blank" rel="noopener" href="${whatsAppUrl(customer.whatsapp, `Halo ${customer.name}, ada informasi mengenai setoran sampah Anda di SIRKULA.`)}">◉ Hubungi</a>`
               : ''
           }
           <button class="btn" data-close-modal>Tutup</button>
         </div>`,
      );
      document.getElementById('modalBody').querySelectorAll('[data-close-modal]').forEach((button) => {
        button.addEventListener('click', () => document.getElementById('modal').classList.remove('show'));
      });
      const target = document.getElementById('customerBalance');
      try {
        const response = await api.get(`/balance/${customer.id}?limit=10`);
        const history = response.data.rows || [];
        target.innerHTML = history.length
          ? history
              .map(
                (row) => `<div class="summary-line">
                  <span>${esc(row.description || 'Perubahan saldo')}<br /><small>${dateTimeFmt(row.createdAt)}</small></span>
                  <b style="color:${row.type === 'credit' ? '#1c7a4f' : '#a24a43'}">${row.type === 'credit' ? '+' : '-'}${money(row.amount)}</b>
                </div>`,
              )
              .join('')
          : '<p class="muted small" style="margin:0">Belum ada riwayat saldo.</p>';
      } catch (error) {
        target.innerHTML = `<div class="alert">${esc(errorMessage(error))}</div>`;
      }
    }

    await load();
  },
};

export { kg };
