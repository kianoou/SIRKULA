import { api, errorMessage } from '../api.js';
import { state, loadPublicInfo } from '../state.js';
import { esc, toast } from '../ui.js';

const DEMO = [
  ['Administrator', 'admin@sirkula.id'],
  ['Pengelola Bank Sampah', 'seller1@sirkula.id'],
  ['Nasabah', 'ayu@sirkula.id'],
];

export default {
  render: async (container, { params }) => {
    const next = params?.get('next') || '/dashboard';
    container.innerHTML = `
      <div class="auth-wrap">
        <div class="auth-card">
          <h1>Masuk ke SIRKULA</h1>
          <p>Gunakan akun yang sudah terdaftar untuk mengelola setoran sampah Anda.</p>
          <div id="loginError" class="alert hidden"></div>
          <form id="loginForm" novalidate>
            <div class="form-group">
              <label for="email">Email</label>
              <input id="email" name="email" type="email" autocomplete="username" placeholder="nama@email.com" required />
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <div class="password-field">
                <input id="password" name="password" type="password" autocomplete="current-password" placeholder="Masukkan password" required />
                <button type="button" class="password-toggle" data-toggle-password aria-label="Tampilkan password">Lihat</button>
              </div>
              <span class="field-error hidden" id="passwordHint">Password wajib diisi.</span>
            </div>
            <button class="btn primary block" type="submit" id="loginButton">Masuk</button>
          </form>
          <div class="demo-box">
            <b>Akun demo (password sama: Sirkula#2026)</b>
            ${DEMO.map(
              ([label, email]) =>
                `<div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0">
                  <span>${esc(label)}</span>
                  <button type="button" class="link-btn" data-demo="${esc(email)}" style="font-size:11px">${esc(email)}</button>
                </div>`,
            ).join('')}
            <div style="margin-top:6px;color:#8a6d3b">Ganti password demo sebelum dipakai di lingkungan nyata.</div>
          </div>
          <div class="auth-foot">Belum punya akun? <a href="#/daftar">Daftar sebagai nasabah</a></div>
        </div>
      </div>`;

    const form = container.querySelector('#loginForm');
    const errorBox = container.querySelector('#loginError');
    const button = container.querySelector('#loginButton');

    const passwordInput = form.password;
    const passwordToggle = container.querySelector('[data-toggle-password]');
    passwordToggle?.addEventListener('click', () => {
      const visible = passwordInput.type === 'text';
      passwordInput.type = visible ? 'password' : 'text';
      passwordToggle.textContent = visible ? 'Lihat' : 'Sembunyi';
      passwordToggle.setAttribute('aria-label', visible ? 'Tampilkan password' : 'Sembunyikan password');
    });

    container.querySelectorAll('[data-demo]').forEach((element) => {
      element.addEventListener('click', () => {
        form.email.value = element.dataset.demo;
        form.password.value = 'Sirkula#2026';
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.classList.add('hidden');
      button.disabled = true;
      button.textContent = 'Memproses...';
      const passwordHint = container.querySelector('#passwordHint');
      if (!form.password.value) {
        passwordHint.textContent = 'Password wajib diisi.';
        passwordHint.classList.remove('hidden');
        button.disabled = false;
        button.textContent = 'Masuk';
        return;
      }
      passwordHint.classList.add('hidden');
      try {
        const response = await api.post('/auth/login', {
          email: form.email.value.trim(),
          password: form.password.value,
        });
        state.user = response.data.user;
        state.loadedAt = 0;
        await loadPublicInfo({ force: true });
        toast(`Selamat datang, ${state.user.name}.`);
        window.location.hash = `#${next.startsWith('/') ? next : '/dashboard'}`;
      } catch (error) {
        errorBox.textContent = errorMessage(error);
        errorBox.classList.remove('hidden');
        passwordHint.textContent = 'Email atau password salah. Periksa kembali input Anda.';
        passwordHint.classList.remove('hidden');
      } finally {
        button.disabled = false;
        button.textContent = 'Masuk';
      }
    });
  },
};
