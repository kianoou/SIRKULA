import { api, errorMessage } from '../api.js';
import { state } from '../state.js';
import {
  closeModal,
  confirmDialog,
  dateFmt,
  emptyState,
  esc,
  initial,
  loadingState,
  money,
  openModal,
  pager,
  roleChip,
  toast,
} from '../ui.js';

const bankFields = `
  <div class="form-grid three" data-bank-fields>
    <div class="form-group"><label>Nama bank sampah</label><input name="bankName" maxlength="120" placeholder="Default: nama pengelola" /></div>
    <div class="form-group"><label>Jam operasional</label><input name="openingHours" maxlength="120" placeholder="Senin–Jumat 08.00–16.00" /></div>
    <div class="form-group"><label>Deskripsi bank</label><input name="bankDescription" maxlength="2000" placeholder="Layanan yang tersedia" /></div>
  </div>`;

export default {
  render: async (container) => {
    container.innerHTML = loadingState('Memuat pengguna...');
    const filters = { search: '', role: '', isActive: '', limit: 20, offset: 0 };
    let rows = [];
    let total = 0;

    container.innerHTML = `
      <div class="page-head">
        <div><h1>Pengguna</h1><p>Kelola akun administrator, pengelola bank sampah, dan nasabah.</p></div>
        <div class="head-actions"><button class="btn primary" id="addUser">＋ Pengguna Baru</button></div>
      </div>
      <div class="panel">
        <div class="toolbar">
          <div class="search"><input type="search" id="userSearch" placeholder="Cari nama atau email" /></div>
          <select class="field-select" id="roleFilter">
            <option value="">Semua role</option>
            <option value="admin">Admin</option>
            <option value="seller">Seller</option>
            <option value="pembeli">Pembeli</option>
          </select>
          <select class="field-select" id="activeFilter">
            <option value="">Semua status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </div>
        <div id="userList">${loadingState()}</div>
      </div>`;

    const list = container.querySelector('#userList');

    async function load() {
      list.innerHTML = loadingState();
      try {
        const params = new URLSearchParams({ limit: filters.limit, offset: filters.offset });
        if (filters.search) params.set('search', filters.search);
        if (filters.role) params.set('role', filters.role);
        if (filters.isActive) params.set('isActive', filters.isActive);
        const response = await api.get(`/users?${params.toString()}`);
        rows = response.data.rows || [];
        total = response.data.total || 0;

        list.innerHTML = rows.length
          ? `<div class="table-wrap"><table>
              <thead><tr><th>Pengguna</th><th>Role</th><th>Kontak</th><th>Saldo</th><th>Status</th><th>Terdaftar</th><th></th></tr></thead>
              <tbody>
                ${rows
                  .map(
                    (user) => `<tr>
                      <td><div class="person"><div class="mini-avatar">${initial(user.name)}</div>
                        <div><div class="cell-title">${esc(user.name)}</div><small class="sub">${esc(user.email)}</small></div></div></td>
                      <td>${roleChip(user.role)}${user.role === 'seller' && user.bankName ? `<small class="sub">${esc(user.bankName)}</small>` : ''}</td>
                      <td><span class="small">${esc(user.whatsapp || user.phone || '-')}</span></td>
                      <td class="nowrap">${money(user.balance)}</td>
                      <td><span class="status ${user.isActive ? 'selesai' : 'dibatalkan'}">${user.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                      <td>${dateFmt(user.createdAt)}</td>
                      <td><div class="row-actions">
                        <button class="btn small" data-edit="${user.id}">Ubah</button>
                        <button class="btn small" data-toggle="${user.id}">${user.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
                        <button class="btn small danger" data-delete="${user.id}">Hapus</button>
                      </div></td>
                    </tr>`,
                  )
                  .join('')}
              </tbody></table></div>
              ${pager(total, filters.limit, filters.offset)}`
          : emptyState('Tidak ada pengguna', 'Ubah filter pencarian atau tambahkan pengguna baru.');

        list.querySelectorAll('[data-edit]').forEach((button) => {
          button.addEventListener('click', () => openUserForm(rows.find((row) => row.id === Number(button.dataset.edit))));
        });
        list.querySelectorAll('[data-toggle]').forEach((button) => {
          button.addEventListener('click', () => toggleActive(rows.find((row) => row.id === Number(button.dataset.toggle))));
        });
        list.querySelectorAll('[data-delete]').forEach((button) => {
          button.addEventListener('click', () => removeUser(rows.find((row) => row.id === Number(button.dataset.delete))));
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
    container.querySelector('#userSearch').addEventListener('input', (event) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        filters.search = event.target.value.trim();
        filters.offset = 0;
        load();
      }, 300);
    });
    container.querySelector('#roleFilter').addEventListener('change', (event) => {
      filters.role = event.target.value;
      filters.offset = 0;
      load();
    });
    container.querySelector('#activeFilter').addEventListener('change', (event) => {
      filters.isActive = event.target.value;
      filters.offset = 0;
      load();
    });

    container.querySelector('#addUser').addEventListener('click', () => openUserForm());

    function syncBankFields(form, role) {
      const wrap = form.querySelector('[data-bank-fields]');
      if (wrap) wrap.style.display = role === 'seller' ? '' : 'none';
    }

    function openUserForm(user = null) {
      const editing = Boolean(user);
      openModal(
        editing ? 'Ubah Pengguna' : 'Pengguna Baru',
        `<form id="userForm">
          <div class="form-grid">
            <div class="form-group"><label>Nama lengkap</label><input name="name" value="${esc(user?.name || '')}" required maxlength="100" /></div>
            <div class="form-group"><label>Email</label><input name="email" type="email" value="${esc(user?.email || '')}" required /></div>
            <div class="form-group"><label>Role</label>
              <select name="role">
                <option value="pembeli" ${user?.role === 'pembeli' ? 'selected' : ''}>Pembeli / Nasabah</option>
                <option value="seller" ${user?.role === 'seller' ? 'selected' : ''}>Seller / Pengelola</option>
                <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </div>
            <div class="form-group"><label>Jenis pengguna</label>
              <select name="userType">
                <option value="masyarakat" ${user?.userType !== 'umkm' ? 'selected' : ''}>Masyarakat</option>
                <option value="umkm" ${user?.userType === 'umkm' ? 'selected' : ''}>UMKM</option>
              </select>
            </div>
            <div class="form-group"><label>Password ${editing ? '(kosongkan bila tidak diubah)' : ''}</label>
              <div class="password-field">
                <input name="password" type="password" minlength="8" ${editing ? '' : 'required'} placeholder="Minimal 8 karakter" />
                <button type="button" class="password-toggle" data-toggle-password aria-label="Tampilkan password">Lihat</button>
              </div>
              <span class="field-error hidden" id="userPasswordHint"></span>
            </div>
            <div class="form-group"><label>Konfirmasi password ${editing ? '(jika mengubah)' : ''}</label>
              <div class="password-field">
                <input name="confirmPassword" type="password" minlength="8" placeholder="Ulangi password" />
                <button type="button" class="password-toggle" data-toggle-confirm aria-label="Tampilkan password">Lihat</button>
              </div>
              <span class="field-error hidden" id="userConfirmHint"></span>
            </div>
            <div class="form-group"><label>Status</label>
              <select name="isActive" ${editing ? '' : 'disabled'}>
                <option value="true" ${user?.isActive !== 0 ? 'selected' : ''}>Aktif</option>
                <option value="false" ${user?.isActive === 0 ? 'selected' : ''}>Nonaktif</option>
              </select>
            </div>
            <div class="form-group"><label>Telepon</label><input name="phone" value="${esc(user?.phone || '')}" maxlength="20" /></div>
            <div class="form-group"><label>WhatsApp</label><input name="whatsapp" value="${esc(user?.whatsapp || '')}" maxlength="20" /></div>
            <div class="form-group full"><label>Alamat</label><textarea name="address" maxlength="255">${esc(user?.address || '')}</textarea></div>
          </div>
          ${editing ? '' : bankFields}
          <div class="modal-actions">
            <button class="btn" type="button" data-close-modal>Batal</button>
            <button class="btn primary" type="submit">Simpan</button>
          </div>
        </form>`,
        { wide: true },
      );
      const form = document.getElementById('modalBody').querySelector('#userForm');
      form.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));
      const setupToggle = (input, button) => {
        button?.addEventListener('click', () => {
          const visible = input.type === 'text';
          input.type = visible ? 'password' : 'text';
          button.textContent = visible ? 'Lihat' : 'Sembunyi';
        });
      };
      setupToggle(form.password, form.querySelector('[data-toggle-password]'));
      setupToggle(form.confirmPassword, form.querySelector('[data-toggle-confirm]'));
      form.role.addEventListener('change', () => syncBankFields(form, form.role.value));
      if (!editing) syncBankFields(form, form.role.value);

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submit = form.querySelector('[type="submit"]');
        submit.disabled = true;
        const passwordHint = form.querySelector('#userPasswordHint');
        const confirmHint = form.querySelector('#userConfirmHint');
        passwordHint.classList.add('hidden');
        confirmHint.classList.add('hidden');
        if (form.password.value && form.password.value.length < 8) {
          passwordHint.textContent = 'Password minimal 8 karakter.';
          passwordHint.classList.remove('hidden');
          submit.disabled = false;
          return;
        }
        if (form.password.value && form.password.value !== form.confirmPassword.value) {
          confirmHint.textContent = 'Konfirmasi password tidak sama.';
          confirmHint.classList.remove('hidden');
          submit.disabled = false;
          return;
        }
        try {
          const payload = {
            name: form.name.value.trim(),
            email: form.email.value.trim(),
            role: form.role.value,
            userType: form.userType.value,
            phone: form.phone.value.trim() || undefined,
            whatsapp: form.whatsapp.value.trim() || undefined,
            address: form.address.value.trim() || undefined,
          };
          if (form.password.value) payload.password = form.password.value;
          if (editing) {
            payload.isActive = form.isActive.value === 'true';
            await api.patch(`/users/${user.id}`, payload);
            if (user.id === state.user.id) await window.sirkula.refreshUser();
          } else {
            payload.bankName = form.bankName?.value.trim() || undefined;
            payload.openingHours = form.openingHours?.value.trim() || undefined;
            payload.bankDescription = form.bankDescription?.value.trim() || undefined;
            await api.post('/users', payload);
          }
          closeModal();
          toast(editing ? 'Data pengguna diperbarui.' : 'Pengguna baru dibuat.');
          await load();
        } catch (error) {
          toast(errorMessage(error), 'error');
        } finally {
          submit.disabled = false;
        }
      });
    }

    async function toggleActive(user) {
      const next = !Number(user.isActive);
      const ok = await confirmDialog({
        title: next ? 'Aktifkan Akun' : 'Nonaktifkan Akun',
        message: next
          ? `Aktifkan kembali akun "${user.name}"? Pengguna dapat masuk seperti biasa.`
          : `Nonaktifkan akun "${user.name}"? Pengguna tidak dapat masuk sampai diaktifkan kembali.`,
        confirmLabel: next ? 'Aktifkan' : 'Nonaktifkan',
        danger: !next,
      });
      if (!ok) return;
      try {
        await api.patch(`/users/${user.id}/active`, { isActive: next });
        toast(next ? 'Akun diaktifkan.' : 'Akun dinonaktifkan.');
        await load();
      } catch (error) {
        toast(errorMessage(error), 'error');
      }
    }

    async function removeUser(user) {
      const ok = await confirmDialog({
        title: 'Hapus Pengguna',
        message: `Hapus akun "${user.name}"? Pengguna yang memiliki riwayat setoran tidak dapat dihapus — nonaktifkan saja akunnya.`,
        confirmLabel: 'Hapus permanen',
        danger: true,
      });
      if (!ok) return;
      try {
        await api.remove(`/users/${user.id}`);
        toast('Pengguna dihapus.');
        await load();
      } catch (error) {
        toast(errorMessage(error), 'error');
      }
    }

    await load();
  },
};
