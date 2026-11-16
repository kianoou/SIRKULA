import { api, errorMessage } from '../api.js';
import { state } from '../state.js';
import { esc, toast } from '../ui.js';

export default {
  render: async (container) => {
    container.innerHTML = `
      <div class="auth-wrap" style="max-width:560px">
        <div class="auth-card">
          <h1>Daftar Sebagai Nasabah</h1>
          <p>Akun nasabah dapat mengajukan setoran sampah dan memantau saldo.</p>
          <div id="registerError" class="alert hidden"></div>
          <form id="registerForm" novalidate>
            <div class="form-grid">
              <div class="form-group full">
                <label for="name">Nama lengkap</label>
                <input id="name" name="name" placeholder="Nama sesuai identitas" required minlength="2" />
              </div>
              <div class="form-group">
                <label for="email">Email</label>
                <input id="email" name="email" type="email" autocomplete="username" placeholder="nama@email.com" required />
              </div>
              <div class="form-group">
                <label for="password">Password</label>
                <div class="password-field">
                  <input id="password" name="password" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter" required minlength="8" />
                  <button type="button" class="password-toggle" data-toggle-password aria-label="Tampilkan password">Lihat</button>
                </div>
                <span class="field-error hidden" id="passwordHint"></span>
              </div>
              <div class="form-group">
                <label for="confirmPassword">Konfirmasi password</label>
                <div class="password-field">
                  <input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" placeholder="Ulangi password" required minlength="8" />
                  <button type="button" class="password-toggle" data-toggle-confirm aria-label="Tampilkan password">Lihat</button>
                </div>
                <span class="field-error hidden" id="confirmHint"></span>
              </div>
              <div class="form-group">
                <label for="userType">Jenis pengguna</label>
                <select id="userType" name="userType">
                  <option value="masyarakat">Masyarakat</option>
                  <option value="umkm">UMKM</option>
                </select>
              </div>
              <div class="form-group">
                <label for="whatsapp">Nomor WhatsApp</label>
                <input id="whatsapp" name="whatsapp" inputmode="tel" placeholder="08xxxxxxxxxx" />
                <span class="help">Dipakai pengelola untuk konfirmasi penimbangan.</span>
              </div>
              <div class="form-group">
                <label for="phone">Telepon</label>
                <input id="phone" name="phone" inputmode="tel" placeholder="08xxxxxxxxxx" />
              </div>
              <div class="form-group full">
                <label for="address">Alamat (opsional)</label>
                <textarea id="address" name="address" placeholder="Alamat domisili atau lokasi usaha"></textarea>
              </div>
            </div>
            <button class="btn primary block" type="submit" id="registerButton">Buat Akun</button>
          </form>
          <div class="auth-foot">Sudah punya akun? <a href="#/masuk">Masuk di sini</a></div>
        </div>
      </div>`;

    const form = container.querySelector('#registerForm');
    const errorBox = container.querySelector('#registerError');
    const button = container.querySelector('#registerButton');

    const passwordInput = form.password;
    const confirmInput = form.confirmPassword;
    const togglePassword = container.querySelector('[data-toggle-password]');
    const toggleConfirm = container.querySelector('[data-toggle-confirm]');
    const setupToggle = (input, button) => {
      button?.addEventListener('click', () => {
        const visible = input.type === 'text';
        input.type = visible ? 'password' : 'text';
        button.textContent = visible ? 'Lihat' : 'Sembunyi';
        button.setAttribute('aria-label', visible ? 'Tampilkan password' : 'Sembunyikan password');
      });
    };
    setupToggle(passwordInput, togglePassword);
    setupToggle(confirmInput, toggleConfirm);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.classList.add('hidden');
      const passwordHint = container.querySelector('#passwordHint');
      const confirmHint = container.querySelector('#confirmHint');
      passwordHint.classList.add('hidden');
      confirmHint.classList.add('hidden');

      if (form.password.value.length < 8) {
        passwordHint.textContent = 'Password minimal 8 karakter.';
        passwordHint.classList.remove('hidden');
        return;
      }
      if (form.password.value !== form.confirmPassword.value) {
        confirmHint.textContent = 'Konfirmasi password tidak sama.';
        confirmHint.classList.remove('hidden');
        return;
      }

      button.disabled = true;
      button.textContent = 'Membuat akun...';
      try {
        const response = await api.post('/auth/register', {
          name: form.name.value.trim(),
          email: form.email.value.trim(),
          password: form.password.value,
          userType: form.userType.value,
          phone: form.phone.value.trim() || undefined,
          whatsapp: form.whatsapp.value.trim() || undefined,
          address: form.address.value.trim() || undefined,
        });
        state.user = response.data.user;
        toast(`${esc(state.user.name)}, akun Anda berhasil dibuat.`);
        window.location.hash = '#/dashboard';
      } catch (error) {
        errorBox.textContent = errorMessage(error);
        errorBox.classList.remove('hidden');
      } finally {
        button.disabled = false;
        button.textContent = 'Buat Akun';
      }
    });
  },
};
