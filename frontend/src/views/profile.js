import { api, errorMessage } from '../api.js';
import { state } from '../state.js';
import {
  dateTimeFmt,
  emptyState,
  esc,
  initial,
  loadingState,
  money,
  pager,
  roleChip,
  toast,
} from '../ui.js';

const roleLabel = (role) =>
  ({ admin: 'Administrator', seller: 'Pengelola Bank Sampah', pembeli: 'Nasabah' })[role] || role;

export default {
  render: async (container, { mode }) => {
    container.innerHTML = loadingState('Memuat profil...');
    let user = state.user;
    try {
      const me = await api.get('/auth/me');
      if (me.data.user) {
        user = me.data.user;
        state.user = user;
      }
    } catch {
      /* tetap gunakan data sesi terakhir */
    }

    container.innerHTML = `
      <div class="page-head">
        <div><h1>Profil Saya</h1><p>Perbarui data kontak, keamanan akun, dan pantau saldo Anda.</p></div>
      </div>
      <div class="grid-two">
        <div>
          <div class="panel">
            <div class="person" style="gap:12px;margin-bottom:14px">
              <div class="avatar" style="width:48px;height:48px;font-size:18px">${initial(user.name)}</div>
              <div>
                <h3 style="font-size:16px">${esc(user.name)}</h3>
                <div class="small muted">${esc(user.email)} ${roleChip(user.role)}</div>
              </div>
            </div>
            <div class="summary-line"><span>Jenis pengguna</span><b>${esc(user.userType === 'umkm' ? 'UMKM' : 'Masyarakat')}</b></div>
            <div class="summary-line"><span>Role</span><b>${esc(roleLabel(user.role))}</b></div>
            <div class="summary-line"><span>Bergabung</span><b>${user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</b></div>
            <div class="summary-line"><span>Akses terakhir</span><b>${user.lastLoginAt ? dateTimeFmt(user.lastLoginAt) : '-'}</b></div>
            ${
              user.role === 'pembeli'
                ? `<div class="summary-line total"><span>Saldo Anda</span><b>${money(user.balance)}</b></div>`
                : ''
            }
          </div>

          <div class="panel">
            <div class="panel-head"><h3>Data Kontak</h3></div>
            <div id="profileError" class="alert hidden"></div>
            <form id="profileForm">
              <div class="form-grid">
                <div class="form-group full"><label>Nama lengkap</label>
                  <input name="name" value="${esc(user.name)}" required minlength="2" maxlength="100" /></div>
                <div class="form-group"><label>Telepon</label>
                  <input name="phone" value="${esc(user.phone || '')}" maxlength="20" placeholder="08xxxxxxxxxx" /></div>
                <div class="form-group"><label>WhatsApp</label>
                  <input name="whatsapp" value="${esc(user.whatsapp || '')}" maxlength="20" placeholder="08xxxxxxxxxx" /></div>
                <div class="form-group full"><label>Alamat</label>
                  <textarea name="address" maxlength="255">${esc(user.address || '')}</textarea></div>
              </div>
              <button class="btn primary" type="submit" id="saveProfile">Simpan Profil</button>
            </form>
          </div>

          <div class="panel">
            <div class="panel-head"><h3>Keamanan Akun</h3></div>
            <div id="passwordError" class="alert hidden"></div>
            <form id="passwordForm">
              <div class="form-grid">
                <div class="form-group"><label>Password saat ini</label>
                  <div class="password-field">
                    <input name="currentPassword" type="password" autocomplete="current-password" required />
                    <button type="button" class="password-toggle" data-toggle-current aria-label="Tampilkan password">Lihat</button>
                  </div></div>
                <div class="form-group"><label>Password baru</label>
                  <div class="password-field">
                    <input name="newPassword" type="password" autocomplete="new-password" minlength="8" required />
                    <button type="button" class="password-toggle" data-toggle-new aria-label="Tampilkan password">Lihat</button>
                  </div>
                  <span class="help">Minimal 8 karakter.</span></div>
                <div class="form-group full"><label>Konfirmasi password baru</label>
                  <div class="password-field">
                    <input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required />
                    <button type="button" class="password-toggle" data-toggle-confirm aria-label="Tampilkan password">Lihat</button>
                  </div>
                  <span class="field-error hidden" id="confirmPasswordHint"></span></div>
              </div>
              <button class="btn" type="submit" id="savePassword">Perbarui Password</button>
            </form>
          </div>
        </div>

        <div class="panel" id="balancePanel">
          <div class="panel-head"><h3>Riwayat Saldo</h3><span id="balanceTotal"></span></div>
          <div id="balanceBody">${loadingState()}</div>
        </div>
      </div>`;

    container.querySelector('#profileForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.target;
      const errorBox = container.querySelector('#profileError');
      const button = container.querySelector('#saveProfile');
      errorBox.classList.add('hidden');
      button.disabled = true;
      try {
        const response = await api.put('/users/me/profile', {
          name: form.name.value.trim(),
          phone: form.phone.value.trim() || undefined,
          whatsapp: form.whatsapp.value.trim() || undefined,
          address: form.address.value.trim() || undefined,
        });
        state.user = response.data.user;
        toast('Profil diperbarui.');
        await window.sirkula.render();
      } catch (error) {
        errorBox.textContent = errorMessage(error);
        errorBox.classList.remove('hidden');
        button.disabled = false;
      }
    });

    const passwordForm = container.querySelector('#passwordForm');
    const setupToggle = (input, button) => {
      button?.addEventListener('click', () => {
        const visible = input.type === 'text';
        input.type = visible ? 'password' : 'text';
        button.textContent = visible ? 'Lihat' : 'Sembunyi';
      });
    };
    setupToggle(passwordForm.currentPassword, passwordForm.querySelector('[data-toggle-current]'));
    setupToggle(passwordForm.newPassword, passwordForm.querySelector('[data-toggle-new]'));
    setupToggle(passwordForm.confirmPassword, passwordForm.querySelector('[data-toggle-confirm]'));

    passwordForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.target;
      const errorBox = container.querySelector('#passwordError');
      const button = container.querySelector('#savePassword');
      const confirmHint = container.querySelector('#confirmPasswordHint');
      errorBox.classList.add('hidden');
      confirmHint.classList.add('hidden');
      if (form.newPassword.value !== form.confirmPassword.value) {
        confirmHint.textContent = 'Konfirmasi password tidak sama.';
        confirmHint.classList.remove('hidden');
        return;
      }
      button.disabled = true;
      try {
        await api.post('/auth/change-password', {
          currentPassword: form.currentPassword.value,
          newPassword: form.newPassword.value,
        });
        form.reset();
        toast('Password berhasil diperbarui.');
      } catch (error) {
        errorBox.textContent = errorMessage(error);
        errorBox.classList.remove('hidden');
      } finally {
        button.disabled = false;
      }
    });

    /* -------------------------------- Riwayat saldo -------------------------------- */
    const balanceBody = container.querySelector('#balanceBody');
    const filters = { limit: mode === 'balance' ? 20 : 10, offset: 0 };
    let total = 0;

    async function loadBalance() {
      balanceBody.innerHTML = loadingState();
      try {
        const response = await api.get(`/balance?limit=${filters.limit}&offset=${filters.offset}`);
        const rows = response.data.rows || [];
        total = response.data.total || 0;
        container.querySelector('#balanceTotal').textContent = `${total} entri`;
        balanceBody.innerHTML = rows.length
          ? `<div class="table-wrap"><table>
              <thead><tr><th>Waktu</th><th>Keterangan</th><th>Nominal</th><th>Saldo Akhir</th></tr></thead>
              <tbody>
                ${rows
                  .map(
                    (row) => `<tr>
                      <td class="small nowrap">${dateTimeFmt(row.createdAt)}</td>
                      <td><span class="small">${esc(row.description || 'Perubahan saldo')}</span>${
                        row.depositCode ? `<small class="sub">${esc(row.depositCode)}</small>` : ''
                      }</td>
                      <td class="nowrap"><b style="color:${row.type === 'credit' ? '#1c7a4f' : '#a24a43'}">${
                        row.type === 'credit' ? '+' : '-'
                      }${money(row.amount)}</b></td>
                      <td class="nowrap">${money(row.balanceAfter)}</td>
                    </tr>`,
                  )
                  .join('')}
              </tbody>
            </table></div>
            ${pager(total, filters.limit, filters.offset)}`
          : emptyState('Belum ada riwayat saldo', 'Saldo bertambah setelah setoran Anda diselesaikan pengelola.');

        balanceBody.querySelector('[data-page-prev]')?.addEventListener('click', () => {
          filters.offset = Math.max(0, filters.offset - filters.limit);
          loadBalance();
        });
        balanceBody.querySelector('[data-page-next]')?.addEventListener('click', () => {
          if (filters.offset + filters.limit < total) {
            filters.offset += filters.limit;
            loadBalance();
          }
        });
      } catch (error) {
        balanceBody.innerHTML = `<div class="alert">${esc(errorMessage(error))}</div>`;
      }
    }

    await loadBalance();
  },
};
