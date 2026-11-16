import { state, whatsAppUrl } from '../state.js';
import { esc } from '../ui.js';

export default {
  render: async (container) => {
    const wa = whatsAppUrl(
      state.settings?.whatsappPengelola,
      'Halo SIRKULA, saya ingin bertanya mengenai prosedur setoran sampah.',
    );
    container.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Cara Menyetor Sampah</h1>
          <p>Panduan singkat agar setoran Anda cepat diverifikasi dan saldo segera bertambah.</p>
        </div>
        <div class="head-actions">
          ${wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">◉ Hubungi Pengelola</a>` : ''}
          <a class="btn primary" href="#/daftar">Daftar Nasabah</a>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>Alur setoran</h3><span>4 tahap</span></div>
        <div class="steps" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
          <div class="step"><span class="num">1</span><b>Pilah sampah</b><span>Pisahkan berdasarkan kategori: plastik, kertas, kardus, logam, kaca, atau minyak jelantah.</span></div>
          <div class="step"><span class="num">2</span><b>Bersihkan & keringkan</b><span>Buang sisa makanan atau cairan agar berat dan kualitas sesuai standar bank sampah.</span></div>
          <div class="step"><span class="num">3</span><b>Ajukan setoran</b><span>Pilih bank sampah, jenis sampah, dan estimasi berat. Unggah foto bila diperlukan (maks. 1,25 MB total).</span></div>
          <div class="step"><span class="num">4</span><b>Timbang & selesaikan</b><span>Pengelola mengisi berat aktual. Setelah diselesaikan, saldo otomatis masuk ke akun Anda.</span></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>Ketentuan setoran</h3></div>
        <div class="notice">${esc(state.settings?.depositInstructions || 'Pisahkan sampah sesuai kategori, bersihkan dari sisa makanan, lalu ajukan setoran melalui aplikasi. Pengelola akan menghubungi Anda untuk penimbangan.')}</div>
        <ul style="margin:0;padding-left:18px;color:#4d6656;font-size:12.5px;line-height:1.9">
          <li>Satu pengajuan dapat berisi maksimal 5 jenis sampah dan 3 lampiran.</li>
          <li>Estimasi berat harus lebih dari 0 kg; berat aktual ditentukan pengelola saat penimbangan.</li>
          <li>Nilai setoran = berat aktual × harga per kilogram yang berlaku saat verifikasi (dibulatkan ke Rupiah).</li>
          <li>Harga per kilogram disimpan sebagai snapshot, sehingga transaksi lama tidak berubah saat harga diperbarui.</li>
          <li>Setoran yang dibatalkan tidak menambah saldo. Saldo hanya bertambah satu kali saat setoran diselesaikan.</li>
        </ul>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>Pertanyaan umum</h3></div>
        <div class="summary-line"><span>Apakah saya harus mengantar sendiri sampah?</span><b style="font-weight:600;max-width:60%">Pengelola akan menghubungi Anda untuk penjadwalan penimbangan atau penjemputan.</b></div>
        <div class="summary-line"><span>Bagaimana cara mencairkan saldo?</span><b style="font-weight:600;max-width:60%">Hubungi pengelola bank sampah melalui WhatsApp yang tersedia di dashboard.</b></div>
        <div class="summary-line"><span>Mengapa status setoran belum berubah?</span><b style="font-weight:600;max-width:60%">Setoran berstatus <i>menunggu</i> sampai pengelola melakukan verifikasi berat.</b></div>
        <div class="summary-line"><span>Apakah data saya aman?</span><b style="font-weight:600;max-width:60%">Password disimpan dalam bentuk hash dan setiap pengguna hanya dapat mengakses data miliknya.</b></div>
      </div>`;
  },
};
