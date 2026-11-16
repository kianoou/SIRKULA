import { api, errorMessage } from '../api.js';
import { state } from '../state.js';
import { esc, loadingState, toast } from '../ui.js';

export default {
  render: async (container) => {
    container.innerHTML = loadingState('Memuat profil bank sampah...');
    let profile;
    try {
      const response = await api.get('/bank-profile');
      profile = response.data.bankProfile;
    } catch (error) {
      container.innerHTML = `<div class="panel"><div class="alert">${esc(errorMessage(error))}</div></div>`;
      return;
    }

    if (state.user.role === 'admin' && !profile) {
      container.innerHTML = `<div class="page-head"><div><h1>Bank Sampah</h1><p>Profil bank sampah dikelola oleh masing-masing akun pengelola.</p></div></div>
        <div class="panel"><div class="notice">Anda masuk sebagai administrator. Untuk mengelola profil bank sampah, gunakan akun seller atau kelola melalui menu <b>Pengguna</b>.</div>
        <a class="btn primary" href="#/pengguna">Buka Manajemen Pengguna</a></div>`;
      return;
    }

    container.innerHTML = `
      <div class="page-head">
        <div><h1>Profil Bank Sampah</h1><p>Informasi ini tampil pada halaman publik dan katalog harga sampah.</p></div>
      </div>
      <div class="grid-two">
        <div class="panel">
          <div class="panel-head"><h3>Informasi Bank Sampah</h3></div>
          <div id="bankError" class="alert hidden"></div>
          <form id="bankForm">
            <div class="form-grid">
              <div class="form-group full"><label>Nama bank sampah</label>
                <input name="name" value="${esc(profile?.name || state.user.name)}" required minlength="2" maxlength="120" /></div>
              <div class="form-group"><label>WhatsApp</label>
                <input name="whatsapp" value="${esc(profile?.whatsapp || state.user.whatsapp || '')}" maxlength="20" placeholder="08xxxxxxxxxx" /></div>
              <div class="form-group"><label>Jam operasional</label>
                <input name="openingHours" value="${esc(profile?.openingHours || '')}" maxlength="120" placeholder="Senin–Sabtu 08.00–16.00" /></div>
              <div class="form-group full"><label>Alamat</label>
                <textarea name="address" maxlength="255">${esc(profile?.address || '')}</textarea></div>
              <div class="form-group full"><label>Deskripsi</label>
                <textarea name="description" maxlength="2000" style="min-height:100px">${esc(profile?.description || '')}</textarea></div>
            </div>
            <button class="btn primary" type="submit" id="saveBank">Simpan Profil</button>
          </form>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Tampilan Publik</h3></div>
          <div class="bank-card" style="box-shadow:none">
            <div class="bank-logo">⌂</div>
            <div style="min-width:0">
              <b>${esc(profile?.name || state.user.name)}</b>
              <p>${esc(profile?.address || 'Alamat belum diisi')}</p>
              <p class="small">${esc(profile?.openingHours || 'Jam operasional belum diisi')}</p>
              ${
                profile?.whatsapp
                  ? `<a class="wa-link" target="_blank" rel="noopener" href="https://wa.me/${String(profile.whatsapp).replace(/\D/g, '').replace(/^0/, '62')}">◉ WhatsApp</a>`
                  : '<span class="wa-empty">WhatsApp belum diisi</span>'
              }
            </div>
          </div>
          <div class="notice" style="margin-top:14px">
            Profil yang lengkap membantu nasabah menemukan dan menghubungi bank sampah Anda. Nomor WhatsApp wajib berupa 9–15 digit.
          </div>
        </div>
      </div>`;

    const form = container.querySelector('#bankForm');
    const errorBox = container.querySelector('#bankError');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.classList.add('hidden');
      const button = container.querySelector('#saveBank');
      button.disabled = true;
      button.textContent = 'Menyimpan...';
      try {
        await api.put('/bank-profile', {
          name: form.name.value.trim(),
          whatsapp: form.whatsapp.value.trim() || undefined,
          address: form.address.value.trim() || undefined,
          description: form.description.value.trim() || undefined,
          openingHours: form.openingHours.value.trim() || undefined,
        });
        toast('Profil bank sampah disimpan.');
        const response = await api.get('/bank-profile');
        profile = response.data.bankProfile;
        await window.sirkula.render();
      } catch (error) {
        errorBox.textContent = errorMessage(error);
        errorBox.classList.remove('hidden');
      } finally {
        button.disabled = false;
        button.textContent = 'Simpan Profil';
      }
    });
  },
};
