import { api } from '../api.js';
import { state, whatsAppUrl } from '../state.js';
import { esc, money, loadingState, toast } from '../ui.js';

async function loadCatalog() {
  const [categories, types] = await Promise.all([
    api.get('/categories?onlyActive=true'),
    api.get('/waste-types?onlyActive=true'),
  ]);
  return { categories: categories.data || [], types: types.data || [] };
}

export default {
  render: async (container) => {
    container.innerHTML = loadingState('Memuat beranda...');
    let data;
    try {
      data = await loadCatalog();
    } catch {
      data = { categories: [], types: [] };
    }
    const banks = state.banks || [];
    const topTypes = [...data.types].sort((a, b) => b.pricePerKg - a.pricePerKg).slice(0, 6);
    const wa = whatsAppUrl(
      state.settings?.whatsappPengelola,
      'Halo SIRKULA, saya ingin bertanya tentang cara menyetor sampah.',
    );

    container.innerHTML = `
      <section class="hero">
        <div>
          <span class="welcome-eyebrow">◉ Bank Sampah Digital</span>
          <h1>Sampah terpilah,<br />bernilai nyata.</h1>
          <p>
            ${esc(state.settings?.appTagline || 'SIRKULA menghubungkan masyarakat dan UMKM dengan bank sampah terdekat.')}
            Ajukan setoran dari rumah, pantau penimbangan, dan lihat saldo Anda tumbuh secara transparan.
          </p>
          <div class="hero-actions">
            <a class="btn light" href="#/daftar">Mulai Jadi Nasabah</a>
            <a class="btn ghost" href="#/katalog" style="color:#fff;border-color:#ffffff55">Lihat Harga Sampah</a>
          </div>
        </div>
        <div class="hero-card">
          <div class="hc-title">Ringkasan Layanan</div>
          <div class="hc-row"><span>Kategori sampah</span><b>${data.categories.length} kategori</b></div>
          <div class="hc-row"><span>Jenis sampah terdaftar</span><b>${data.types.length} jenis</b></div>
          <div class="hc-row"><span>Bank sampah mitra</span><b>${banks.length} bank sampah</b></div>
          <div class="hc-row"><span>Perhitungan</span><b>Berat aktual × harga/kg</b></div>
          <div class="hc-row"><span>Status</span><b style="color:#c9f28e">Transparan & tercatat</b></div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <h2>Harga sampah hari ini</h2>
            <p>Harga per kilogram yang berlaku di bank sampah mitra SIRKULA.</p>
          </div>
          <a class="btn small" href="#/katalog">Lihat semua katalog →</a>
        </div>
        ${
          topTypes.length
            ? `<div class="cards">
                ${topTypes
                  .map(
                    (type) => `
                  <article class="waste-card">
                    <div class="waste-symbol">${esc(type.categoryIcon || '♻')}</div>
                    <span class="category-chip">${esc(type.categoryName)}</span>
                    <h3 style="margin-top:8px">${esc(type.name)}</h3>
                    <p>${esc(type.description || 'Sampah terpilah yang diterima bank sampah mitra.')}</p>
                    <div class="price">${money(type.pricePerKg)} <small>/ ${esc(type.unit || 'kg')}</small></div>
                  </article>`,
                  )
                  .join('')}
              </div>`
            : `<div class="empty"><b>Katalog belum tersedia</b>Pengelola bank sampah belum menambahkan jenis sampah.</div>`
        }
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <h2>Setor sampah dalam 4 langkah</h2>
            <p>Tanpa antre, tanpa catatan manual — semua tercatat di sistem.</p>
          </div>
          <a class="btn small" href="#/tentang">Panduan lengkap</a>
        </div>
        <div class="steps">
          <div class="step"><span class="num">1</span><b>Daftar akun</b><span>Buat akun nasabah dengan email dan nomor WhatsApp aktif.</span></div>
          <div class="step"><span class="num">2</span><b>Ajukan setoran</b><span>Pilih bank sampah, jenis sampah, dan estimasi berat. Lampirkan foto bila perlu.</span></div>
          <div class="step"><span class="num">3</span><b>Penimbangan</b><span>Pengelola memverifikasi berat aktual dan harga per kilogram.</span></div>
          <div class="step"><span class="num">4</span><b>Saldo bertambah</b><span>Setoran selesai dan saldo Anda otomatis tercatat di riwayat.</span></div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <h2>Bank sampah mitra</h2>
            <p>Hubungi pengelola langsung melalui WhatsApp untuk penjadwalan penimbangan.</p>
          </div>
        </div>
        ${
          banks.length
            ? `<div class="grid-three">
                ${banks
                  .map((bank) => {
                    const link = whatsAppUrl(
                      bank.whatsapp,
                      `Halo ${bank.name}, saya ingin menyetor sampah melalui SIRKULA.`,
                    );
                    return `
                      <article class="bank-card">
                        <div class="bank-logo">⌂</div>
                        <div style="min-width:0">
                          <b>${esc(bank.name)}</b>
                          <p>${esc(bank.address || 'Alamat belum diisi')}${
                            bank.openingHours ? ` · ${esc(bank.openingHours)}` : ''
                          }</p>
                          ${link ? `<a class="wa-link" href="${link}" target="_blank" rel="noopener">◉ Chat WhatsApp</a>` : '<span class="wa-empty">Nomor WhatsApp belum tersedia</span>'}
                        </div>
                      </article>`;
                  })
                  .join('')}
              </div>`
            : `<div class="empty"><b>Belum ada bank sampah aktif</b>Silakan hubungi pengelola SIRKULA.</div>`
        }
      </section>

      <section class="section">
        <div class="panel" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
          <div>
            <h3 style="font-size:17px;margin-bottom:4px">Siap mengubah sampah menjadi saldo?</h3>
            <p class="muted small" style="margin:0">Gratis, cukup daftar sebagai nasabah dan ajukan setoran pertama Anda.</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a class="btn primary" href="#/daftar">Daftar Sekarang</a>
            ${wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">Tanya via WhatsApp</a>` : ''}
          </div>
        </div>
      </section>`;
  },
};
