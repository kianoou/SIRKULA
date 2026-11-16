import { api, errorMessage } from '../api.js';
import {
  dateTimeFmt,
  emptyState,
  esc,
  initial,
  loadingState,
  pager,
} from '../ui.js';

export default {
  render: async (container) => {
    container.innerHTML = loadingState('Memuat log aktivitas...');
    const filters = { action: '', limit: 30, offset: 0 };
    let rows = [];
    let total = 0;

    container.innerHTML = `
      <div class="page-head">
        <div><h1>Aktivitas Sistem</h1><p>Jejak audit tindakan penting: login, pembuatan pengguna, dan transaksi setoran.</p></div>
      </div>
      <div class="panel">
        <div class="toolbar">
          <input class="field-select" id="actionFilter" placeholder="Filter aksi, misal: auth.login" style="min-width:240px;flex:1" />
        </div>
        <div id="activityList">${loadingState()}</div>
      </div>`;

    const list = container.querySelector('#activityList');

    async function load() {
      list.innerHTML = loadingState();
      try {
        const params = new URLSearchParams({ limit: filters.limit, offset: filters.offset });
        if (filters.action) params.set('action', filters.action);
        const response = await api.get(`/activity-logs?${params.toString()}`);
        rows = response.data.rows || [];
        total = response.data.total || 0;

        list.innerHTML = rows.length
          ? `<div class="table-wrap"><table>
              <thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Keterangan</th><th>Entitas</th><th>IP</th></tr></thead>
              <tbody>
                ${rows
                  .map(
                    (log) => `<tr>
                      <td class="nowrap small">${dateTimeFmt(log.created_at || log.createdAt)}</td>
                      <td><div class="person"><div class="mini-avatar">${initial(log.user_name || 'S')}</div>
                        <div><div class="cell-title">${esc(log.user_name || 'Sistem')}</div><small class="sub">${esc(log.user_email || '')}</small></div></div></td>
                      <td><span class="category-chip">${esc(log.action)}</span></td>
                      <td><span class="small">${esc(log.description || '-')}</span></td>
                      <td class="small">${esc(log.entity || '-')}${log.entity_id ? `#${esc(log.entity_id)}` : ''}</td>
                      <td class="small muted">${esc(log.ip_address || '-')}</td>
                    </tr>`,
                  )
                  .join('')}
              </tbody></table></div>
              ${pager(total, filters.limit, filters.offset)}`
          : emptyState('Belum ada aktivitas tercatat');

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
    container.querySelector('#actionFilter').addEventListener('input', (event) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        filters.action = event.target.value.trim();
        filters.offset = 0;
        load();
      }, 300);
    });

    await load();
  },
};
