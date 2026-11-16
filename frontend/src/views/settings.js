import { api, errorMessage } from '../api.js';
import { state, loadPublicInfo } from '../state.js';
import { esc, loadingState, toast } from '../ui.js';

export default {
  render: async (container) => {
    container.innerHTML = loadingState('Memuat pengaturan...');
    let settings;
    try {
      const response = await api.get('/settings');
      settings = response.data.settings;
    } catch (error) {
      container.innerHTML = `<div class="panel"><div class="alert">${esc(errorMessage(error))}</div></div>`;
      return;
    }

    container.innerHTML = `
      <div class="page-head">
        <div><h1>Pengaturan Aplikasi</h1><p>Informasi publik dan kontak pengelola yang tampil pada halaman SIRKULA.</p></div>
      </div>
      <div class="grid-two">
        <div class="panel">
          <div class="panel-head"><h3>Identitas & Kontak</h3></div>
          <div id="settingsError" class="alert hidden"></div>
          <form id="settingsForm">
            <div class="form-grid">
              <div class="form-group"><label for="appName">Nama aplikasi</label>
                <input id="appName" name="appName" value="${esc(settings.appName || 'SIRKULA')}" maxlength="60" required /></div>
              <div class="form-group"><label for="whatsappPengelola">WhatsApp pengelola</label>
                <input id="whatsappPengelola" name="whatsappPengelola" value="${esc(settings.whatsappPengelola || '')}" maxlength="20" placeholder="08xxxxxxxxxx" />
                <span class="help">Nomor ini dipakai tombol WhatsApp pada dashboard nasabah dan halaman publik.</span>
              </div>
              <div class="form-group full"><label for="appTagline">Tagline</label>
                <input id="appTagline" name="appTagline" value="${esc(settings.appTagline || '')}" maxlength="100" /></div>
              <div class="form-group full"><label for="depositInstructions">Petunjuk setoran</label>
                <textarea id="depositInstructions" name="depositInstructions" maxlength="2000" style="min-height:120px">${esc(settings.depositInstructions || '')}</textarea>
                <span class="help">Tampil pada halaman "Cara Setor" dan panduan nasabah.</span>
              </div>
            </div>
            <button class="btn primary" type="submit" id="saveSettings">Simpan Pengaturan</button>
          </form>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Pratinjau</h3></div>
          <div class="welcome-banner" style="margin:0">
            <div class="welcome-copy">
              <span class="welcome-eyebrow">◉ ${esc(settings.appName || 'SIRKULA')}</span>
              <h2 style="font-size:20px">${esc(settings.appTagline || 'Bank Sampah Digital')}</h2>
              <p>Tampilan ini mengikuti nama dan tagline yang Anda simpan.</p>
            </div>
          </div>
          <div class="notice" style="margin-top:14px">
            Perubahan berlaku untuk seluruh pengguna. Pastikan nomor WhatsApp aktif dan sesuai format nasional (contoh 0812xxxxxxx).
          </div>
        </div>
      </div>`;

    const form = container.querySelector('#settingsForm');
    const errorBox = container.querySelector('#settingsError');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.classList.add('hidden');
      const button = container.querySelector('#saveSettings');
      button.disabled = true;
      button.textContent = 'Menyimpan...';
      try {
        const payload = {
          appName: form.appName.value.trim(),
          appTagline: form.appTagline.value.trim(),
          whatsappPengelola: form.whatsappPengelola.value.trim(),
          depositInstructions: form.depositInstructions.value.trim(),
        };
        const response = await api.put('/settings', payload);
        state.settings = { ...(state.settings || {}), ...response.data.settings };
        state.loadedAt = 0;
        await loadPublicInfo({ force: true });
        toast('Pengaturan aplikasi disimpan.');
      } catch (error) {
        errorBox.textContent = errorMessage(error);
        errorBox.classList.remove('hidden');
      } finally {
        button.disabled = false;
        button.textContent = 'Simpan Pengaturan';
      }
    });
  },
};
