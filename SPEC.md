# SPEC.md — SIRKULA

**Nama aplikasi:** SIRKULA — Bank Sampah Digital  
**Versi spesifikasi:** 1.0  
**Acuan prototype:** SIRKULA Prototype V3  
**Jenis aplikasi:** Web application, single-device demonstration  
**Status:** Spesifikasi MVP untuk implementasi dan pengujian manual

---

## 1. Project Overview dan Tujuan Aplikasi

SIRKULA adalah aplikasi bank sampah digital berbasis web untuk membantu masyarakat dan pelaku UMKM mengajukan setoran sampah yang dapat didaur ulang. Aplikasi juga membantu pengelola mencatat kategori sampah, harga per kilogram, data nasabah, hasil penimbangan, nilai setoran, dan saldo nasabah.

Prototype ditujukan untuk latihan pengembangan selama satu hari. Seluruh proses berjalan pada satu perangkat dan satu browser tanpa backend. Data demonstrasi disimpan menggunakan `localStorage`.

### Tujuan

1. Mengubah pencatatan setoran sampah dari catatan manual menjadi pencatatan digital sederhana.
2. Menampilkan kategori dan harga sampah per kilogram secara transparan.
3. Mengurangi kesalahan perhitungan nilai setoran melalui kalkulasi otomatis.
4. Menyediakan riwayat transaksi dan saldo nasabah yang mudah diperiksa.
5. Menyediakan bukti pendukung berupa gambar atau dokumen pada pengajuan setoran.
6. Memudahkan komunikasi pengelola dan nasabah melalui tautan WhatsApp.

**Batas penggunaan:** SIRKULA merupakan simulasi pencatatan bank sampah, bukan sistem keuangan atau pembayaran sungguhan.

## 2. Latar Belakang dan Permasalahan

Pencatatan bank sampah secara manual dapat menimbulkan beberapa kendala, seperti data nasabah tersebar, perubahan harga tidak tercatat konsisten, perhitungan nilai setoran dilakukan berulang, serta riwayat transaksi dan saldo sulit ditelusuri.

Permasalahan yang menjadi fokus MVP:

- Pengelola membutuhkan daftar kategori dan harga sampah yang dapat diperbarui.
- Pengajuan setoran perlu mencatat nasabah, kategori, estimasi berat, tanggal, dan catatan.
- Berat akhir harus didasarkan pada hasil penimbangan, bukan estimasi nasabah.
- Nilai transaksi harus dihitung secara konsisten berdasarkan berat aktual dan harga yang berlaku saat verifikasi.
- Saldo hanya boleh bertambah ketika transaksi selesai dan tidak boleh bertambah dua kali.
- Pengelola memerlukan riwayat yang menunjukkan status setiap setoran.
- Nasabah perlu menyertakan foto atau dokumen pendukung dan nomor WhatsApp yang dapat dihubungi.

## 3. Target Pengguna

### 3.1 Nasabah

Masyarakat atau pelaku UMKM yang menyetorkan sampah daur ulang. Pada prototype, nasabah tidak memiliki akun atau sesi login tersendiri. Pengajuan dilakukan melalui formulir yang dioperasikan pada perangkat demonstrasi dengan memilih data nasabah.

### 3.2 Pengelola Bank Sampah

Pengguna yang mengoperasikan seluruh fungsi pengelolaan, antara lain mengatur kategori dan harga, mengelola data nasabah, membuat pengajuan demonstrasi, memverifikasi berat aktual, menyelesaikan atau membatalkan transaksi, dan mengatur nomor WhatsApp pengelola.

### 3.3 Model penggunaan

Satu browser dan satu perangkat digunakan untuk demonstrasi kedua peran. Tidak ada autentikasi, pembatasan hak akses, atau pemisahan sesi antar pengguna pada MVP.

## 4. Solusi dan Alur Penggunaan Aplikasi

### 4.1 Alur pengajuan setoran

1. Pengguna membuka menu **Setoran Sampah** atau tombol **Ajukan Setoran** pada dashboard.
2. Pengguna memilih nasabah yang telah terdaftar.
3. Pengguna memilih satu kategori sampah aktif dari pilihan kategori berbentuk kartu.
4. Pengguna mengisi estimasi berat dalam kilogram, tanggal setoran, dan catatan opsional.
5. Pengguna dapat melampirkan maksimal tiga gambar atau dokumen yang didukung.
6. Sistem memvalidasi input dan menyimpan pengajuan dengan status `menunggu`.
7. Pengajuan muncul pada antrean setoran dan riwayat transaksi.

### 4.2 Alur verifikasi dan penimbangan

1. Pengelola membuka antrean setoran.
2. Pengelola memilih transaksi berstatus `menunggu` melalui tombol **Verifikasi**.
3. Sistem menampilkan detail setoran dan lampiran pendukung.
4. Pengelola memasukkan berat aktual dan harga per kilogram yang berlaku saat verifikasi. Harga awal diisi dari harga kategori saat itu dan dapat dikoreksi pengelola.
5. Sistem memvalidasi bahwa berat aktual dan harga tidak negatif.
6. Sistem menghitung `totalNilai = beratAktual × hargaPerKg`, dibulatkan ke Rupiah utuh.
7. Sistem menyimpan harga sebagai snapshot transaksi dan mengubah status menjadi `diverifikasi`.

### 4.3 Alur penyelesaian

1. Pengelola memilih transaksi berstatus `diverifikasi` dan menekan **Selesaikan**.
2. Sistem menampilkan konfirmasi nilai yang akan ditambahkan.
3. Setelah dikonfirmasi, sistem menambahkan nilai transaksi ke saldo nasabah tepat satu kali.
4. Sistem menandai `saldoCredited = true`, mengubah status menjadi `selesai`, lalu memperbarui dashboard, saldo nasabah, dan riwayat.

### 4.4 Alur pembatalan

Pengelola dapat membatalkan transaksi yang masih berstatus `menunggu` atau `diverifikasi`. Transaksi berstatus `dibatalkan` tidak menambah saldo. Transaksi yang telah `selesai` tidak dapat dibatalkan melalui MVP.

### 4.5 Pengelolaan WhatsApp

- Pengelola dapat menambahkan atau mengganti nomor WhatsApp pengelola melalui tombol pengaturan WhatsApp di bagian atas aplikasi.
- Nomor WhatsApp nasabah dapat diisi atau diubah melalui formulir tambah/edit nasabah.
- Tombol/link WhatsApp membuka `https://wa.me/<nomor>` pada tab atau aplikasi baru.
- Aplikasi hanya membuat tautan untuk membuka percakapan. Aplikasi tidak mengirim pesan otomatis dan tidak menggunakan WhatsApp API.

## 5. Daftar Fitur MVP

| ID | Fitur | Deskripsi | Prioritas |
|---|---|---|---|
| F-01 | Dashboard | Menampilkan total berat setoran selesai, jumlah nasabah, jumlah transaksi, total nilai setoran, antrean status, komposisi kategori, dan transaksi terbaru. | Must |
| F-02 | Katalog kategori | Menampilkan nama kategori, ikon, deskripsi, status aktif, dan harga per kilogram. | Must |
| F-03 | CRUD kategori | Pengelola dapat menambah, mengubah, mengaktifkan/nonaktifkan, dan menghapus kategori yang belum digunakan transaksi. | Must |
| F-04 | Data nasabah | Menampilkan nama, jenis pengguna, jumlah transaksi, saldo, serta nomor WhatsApp. | Must |
| F-05 | CRUD nasabah | Pengelola dapat menambah dan mengubah nasabah. Nasabah yang telah memiliki riwayat transaksi tidak dapat dihapus melalui MVP. | Must |
| F-06 | Pengajuan setoran | Form mencakup nasabah, pilihan kategori, estimasi berat, tanggal, catatan, dan lampiran opsional. | Must |
| F-07 | Upload lampiran | Mendukung gambar dan dokumen dengan batas jumlah dan ukuran yang ditentukan pada bagian 6. | Must |
| F-08 | Verifikasi setoran | Pengelola mengisi berat aktual dan harga per kilogram, melihat lampiran, serta menyimpan hasil verifikasi. | Must |
| F-09 | Kalkulasi nilai | Sistem menghitung nilai setoran dari berat aktual dikalikan harga snapshot. | Must |
| F-10 | Penyelesaian transaksi | Status berubah menjadi selesai dan saldo bertambah satu kali. | Must |
| F-11 | Pembatalan transaksi | Setoran menunggu atau diverifikasi dapat dibatalkan tanpa menambah saldo. | Must |
| F-12 | Riwayat transaksi | Menampilkan seluruh transaksi serta filter status dan pencarian. | Must |
| F-13 | Saldo nasabah | Menampilkan saldo hasil akumulasi setoran yang selesai. | Must |
| F-14 | Komposisi sampah | Menampilkan berat aktual setoran selesai per kategori. | Must |
| F-15 | WhatsApp | Pengaturan nomor pengelola dan nomor nasabah, validasi sederhana, serta tautan chat WhatsApp. | Must |
| F-16 | Persistensi lokal | Menyimpan kategori, nasabah, transaksi, nomor WhatsApp, dan lampiran pada `localStorage`. | Must |
| F-17 | Data simulasi | Menyediakan kategori, nasabah, dan transaksi contoh agar dashboard dapat didemonstrasikan sejak awal. | Must |

### 5.1 Navigasi halaman

Navigasi utama terdiri dari:

1. **Dashboard** — ringkasan aktivitas dan tindakan cepat.
2. **Kategori Sampah** — katalog, harga, dan pengelolaan kategori.
3. **Data Nasabah** — daftar nasabah, saldo, dan kontak WhatsApp.
4. **Setoran Sampah** — antrean setoran `menunggu` dan `diverifikasi`, termasuk tombol verifikasi, selesaikan, dan batalkan.
5. **Riwayat Transaksi** — semua status transaksi dengan pencarian dan filter status.

Modal digunakan untuk formulir tambah/edit, pengaturan WhatsApp, penimbangan/verifikasi, dan detail transaksi.

## 6. Data Model dan Aturan Bisnis

### 6.1 WasteType

| Field | Tipe | Aturan |
|---|---|---|
| `id` | string | Primary identifier unik. |
| `nama` | string | Wajib diisi. |
| `hargaPerKg` | number | Wajib angka dan `>= 0`. |
| `satuan` | string | Default `kg`. |
| `deskripsi` | string | Opsional. |
| `aktif` | boolean | Menentukan apakah kategori dapat dipilih untuk setoran baru. |
| `icon` | string | Ikon/karakter visual kategori. |

Kategori awal: Plastik, Kardus, Kertas, dan Kaleng. Harga awal merupakan data simulasi dan dapat diubah pengelola.

### 6.2 Customer

| Field | Tipe | Aturan |
|---|---|---|
| `id` | string | Primary identifier unik. |
| `nama` | string | Wajib diisi. |
| `jenisPengguna` | enum | `masyarakat` atau `UMKM`. |
| `saldo` | number | Saldo simulasi, tidak boleh negatif. Bertambah hanya dari transaksi selesai. |
| `whatsapp` | string | Opsional; disimpan dalam bentuk nomor ternormalisasi kode negara Indonesia bila nomor lokal dikenali. |

### 6.3 Deposit

| Field | Tipe | Aturan |
|---|---|---|
| `id` | string | ID transaksi unik, misalnya `S-1001`. |
| `customerId` | string | Referensi ke `Customer.id`. |
| `jenisSampahId` | string | Referensi ke `WasteType.id`. |
| `jenisSampahNama` | string | Snapshot nama kategori untuk menjaga keterbacaan riwayat. |
| `beratEstimasi` | number | Wajib `> 0` kilogram. |
| `beratAktual` | number/null | `null` sebelum penimbangan; setelah verifikasi harus `>= 0`. |
| `hargaPerKg` | number | Snapshot harga yang digunakan saat verifikasi; harus `>= 0`. |
| `totalNilai` | number | `>= 0`; dihitung dari berat aktual dikali harga snapshot. |
| `tanggal` | string | Tanggal setoran format `YYYY-MM-DD`. |
| `status` | enum | `menunggu`, `diverifikasi`, `selesai`, atau `dibatalkan`. |
| `catatan` | string | Opsional. |
| `saldoCredited` | boolean | Penanda bahwa saldo untuk transaksi ini sudah ditambahkan. Default `false`. |
| `attachments` | array | Daftar lampiran opsional; setiap item menyimpan `name`, `type`, `size`, dan `dataUrl`. |

### 6.4 Pengaturan aplikasi

Data konfigurasi minimal yang disimpan bersama state aplikasi:

| Field | Tipe | Keterangan |
|---|---|---|
| `whatsappPengelola` | string | Nomor WhatsApp pengelola yang dapat diganti. |
| `nextId` | number | Penomoran ID transaksi berikutnya. |

### 6.5 Aturan bisnis

1. Berat dan harga tidak boleh negatif. Estimasi berat setoran harus lebih besar dari nol.
2. Berat aktual hanya boleh diisi atau diubah oleh pengelola pada tahap verifikasi.
3. Perhitungan menggunakan berat aktual, bukan berat estimasi.
4. Rumus nilai setoran: `totalNilai = Math.round(beratAktual × hargaPerKg)`.
5. Harga per kilogram disimpan pada transaksi sebagai snapshot saat verifikasi. Perubahan harga kategori setelahnya tidak mengubah transaksi lama.
6. Setoran `menunggu` belum memiliki nilai final dan tidak menambah saldo.
7. Setoran `diverifikasi` sudah memiliki nilai final tetapi belum menambah saldo.
8. Saldo bertambah hanya ketika status berubah menjadi `selesai`.
9. Penambahan saldo hanya boleh dilakukan jika `saldoCredited` masih `false`; setelah penambahan, nilainya menjadi `true`.
10. Setoran `dibatalkan` tidak menambah saldo.
11. Transisi status yang diperbolehkan: `menunggu → diverifikasi → selesai`; `menunggu → dibatalkan`; `diverifikasi → dibatalkan`.
12. Transaksi `selesai` dan `dibatalkan` merupakan status akhir pada MVP.
13. Kategori nonaktif tidak dapat dipilih untuk setoran baru.
14. Kategori yang sudah dirujuk transaksi tidak dapat dihapus; pengelola dapat menonaktifkannya.
15. Nasabah yang memiliki transaksi tidak dapat dihapus agar relasi dan riwayat tidak rusak.
16. Perubahan harga kategori hanya berlaku untuk transaksi yang diverifikasi setelah perubahan tersebut.
17. Jumlah transaksi pada dashboard mencakup seluruh transaksi yang tersimpan. Total berat dan total nilai setoran pada dashboard hanya menjumlahkan transaksi `selesai`. Komposisi sampah dihitung dari berat aktual transaksi `selesai`.

### 6.6 Aturan lampiran

- Maksimal tiga file per pengajuan.
- Total ukuran seluruh file maksimal 1,25 MB per pengajuan.
- Format gambar: JPG/JPEG, PNG, WEBP, dan GIF.
- Format dokumen: PDF, DOC, DOCX, XLS, XLSX, dan TXT.
- Lampiran dikonversi menjadi Data URL/Base64 untuk penyimpanan lokal.
- Lampiran dapat dilihat atau diunduh dari detail transaksi dan proses verifikasi.
- Pengguna dapat menghapus pilihan lampiran sebelum formulir dikirim.
- Jika format atau ukuran tidak sesuai, pengajuan ditolak dan sistem menampilkan pesan.

**Catatan teknis:** Penyimpanan Base64 meningkatkan ukuran data dan kapasitas `localStorage` tiap browser terbatas. Batas 1,25 MB adalah pembatasan aplikasi untuk demonstrasi, bukan jaminan bahwa semua browser selalu memiliki ruang penyimpanan yang cukup.

### 6.7 Aturan nomor WhatsApp

- Nomor boleh ditulis dengan awalan `08`, `8`, `62`, atau `0062`.
- Sistem menormalisasi nomor lokal menjadi kode negara Indonesia (`62`) sebelum membuat tautan.
- Input nomor wajib untuk pengaturan WhatsApp pengelola; nomor nasabah bersifat opsional.
- Validasi prototipe memeriksa panjang nomor setelah normalisasi (9–15 digit), bukan memverifikasi kepemilikan atau keterjangkauan nomor.
- Tautan WhatsApp dibuka melalui `wa.me`. Pengiriman pesan tetap dilakukan oleh pengguna.

## 7. Nonfunctional Requirements

| ID | Kebutuhan | Kriteria |
|---|---|---|
| NFR-01 | Responsif | Layout dapat digunakan pada desktop dan mobile. |
| NFR-02 | Kemudahan penggunaan | Label, tombol, status, dan pesan validasi mudah dipahami. |
| NFR-03 | Konsistensi tampilan | Menggunakan tema visual botanical/eco: forest green, lime, dan ivory dengan kontras yang memadai. |
| NFR-04 | Persistensi | Data demonstrasi tetap tersedia setelah halaman dimuat ulang pada browser/perangkat yang sama selama data browser tidak dihapus. |
| NFR-05 | Validasi | Form memvalidasi input wajib, berat, harga, nomor WhatsApp, jumlah file, dan ukuran file. |
| NFR-06 | Format data | Mata uang memakai format Rupiah (IDR); berat memakai kilogram (kg). |
| NFR-07 | Kejelasan status | Status transaksi terlihat pada daftar setoran, dashboard, detail, dan riwayat. |
| NFR-08 | Kinerja prototipe | Tidak memerlukan backend, build server, atau layanan eksternal untuk fungsi inti. |
| NFR-09 | Penanganan error | Jika penyimpanan gagal, sistem menampilkan pesan dan mengembalikan perubahan state yang belum berhasil disimpan. |
| NFR-10 | Privasi demonstrasi | Gunakan data contoh fiktif; jangan masukkan data pribadi nyata atau informasi rahasia. |

### 7.1 Teknologi

**Prototype saat ini:**

- HTML untuk struktur antarmuka.
- CSS untuk tema dan layout responsif.
- JavaScript vanilla untuk interaksi, validasi, perhitungan, dan pengelolaan state.
- `localStorage` untuk persistensi data.
- `FileReader` untuk membaca file menjadi Data URL.
- `wa.me` sebagai tautan eksternal untuk membuka WhatsApp.

**Arah pengembangan setelah prototype:**

- Vite sebagai development server dan bundler.
- JavaScript vanilla dengan pemisahan modul UI, data, dan utilitas.
- Node.js + Express.js sebagai backend.
- SQLite sebagai database.
- Penyimpanan file terpisah dari database bila aplikasi sudah memiliki backend.

Migrasi teknologi tersebut bukan bagian dari MVP satu hari.

## 8. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi pada MVP |
|---|---|---|
| Data `localStorage` terhapus atau browser berganti | Data demo hilang/tidak terbawa ke perangkat lain. | Gunakan satu browser/perangkat untuk demo; jelaskan bahwa belum ada sinkronisasi atau backup server. |
| Kuota penyimpanan browser penuh | Data atau lampiran gagal disimpan. | Batasi total lampiran 1,25 MB; tampilkan pesan error dan jangan menganggap penyimpanan berhasil. |
| Pengguna mengisi berat/harga salah | Nilai setoran tidak akurat. | Validasi angka dan minta pengelola memasukkan hasil timbang aktual. |
| Saldo bertambah ganda | Saldo tidak sesuai riwayat. | Gunakan `saldoCredited` sebagai penanda idempotensi dan uji pemrosesan ulang transaksi. |
| Harga kategori berubah | Riwayat transaksi lama berubah jika hanya mengacu ke harga kategori saat ini. | Simpan `hargaPerKg` sebagai snapshot pada setiap transaksi saat verifikasi. |
| Kategori/nasabah dihapus saat masih digunakan | Referensi transaksi rusak. | Cegah penghapusan data yang sudah memiliki relasi transaksi. |
| Nomor WhatsApp salah | Tautan chat tidak mengarah ke nomor yang tepat. | Validasi format dasar dan tampilkan nomor yang disimpan untuk diperiksa pengguna. |
| Lampiran tidak aman atau terlalu besar | Penyimpanan membengkak atau file tidak dapat dibaca. | Batasi ekstensi/MIME, jumlah, dan ukuran file; jangan menjalankan file yang diunggah. |
| Pengguna menganggap saldo sebagai uang yang dapat dicairkan | Salah persepsi penggunaan. | Tampilkan keterangan bahwa aplikasi adalah simulasi dan bukan transaksi keuangan sungguhan. |
| Beberapa orang mengubah data bersamaan | Data dapat saling menimpa. | Batasi pemakaian pada satu perangkat dan satu sesi demonstrasi. |

## 9. Out of Scope

Fitur berikut tidak dikembangkan pada MVP:

- Login, registrasi akun, autentikasi, dan role-based access control.
- Backend, database server, sinkronisasi multi-perangkat, dan multi-cabang.
- Pembayaran online, transfer bank, pencairan saldo, atau dompet digital.
- Integrasi WhatsApp Business API, pengiriman pesan otomatis, dan notifikasi otomatis.
- GPS, peta, penjemputan, penjadwalan armada, atau pelacakan kendaraan.
- IoT, timbangan digital terhubung, QR code, barcode, atau RFID.
- AI, prediksi, rekomendasi otomatis, atau klasifikasi gambar sampah.
- Klaim pengurangan emisi atau dampak lingkungan tanpa metodologi dan perhitungan tervalidasi.
- Laporan akuntansi, ekspor Excel/PDF, audit log, dan backup otomatis.
- Penarikan saldo, koreksi saldo manual, dan pembukuan keuangan sungguhan.
- Pengelolaan gudang, stok hasil sortir, penjualan material ke pengepul, serta pencatatan biaya operasional.

## 10. Acceptance Criteria dan Pengujian Manual

Pengujian dilakukan pada browser modern (misalnya Chrome atau Edge) dengan data lokal. Semua skenario berikut dapat dijalankan tanpa backend.

| ID | Skenario uji | Langkah uji | Hasil yang diharapkan |
|---|---|---|---|
| AC-01 | Dashboard awal | Buka aplikasi untuk pertama kali. | Kartu ringkasan, komposisi, transaksi terbaru, dan data simulasi tampil. |
| AC-02 | Navigasi | Klik setiap menu pada sidebar. | Halaman sesuai menu terbuka dan penanda menu aktif berubah. |
| AC-03 | Katalog kategori | Buka Kategori Sampah. | Kategori awal Plastik, Kardus, Kertas, dan Kaleng tampil beserta harga/kg. |
| AC-04 | Tambah kategori | Tambahkan kategori dengan nama dan harga valid. | Kategori baru muncul pada katalog dan dapat dipilih untuk pengajuan. |
| AC-05 | Validasi harga | Tambahkan/edit kategori dengan harga negatif. | Sistem menolak nilai negatif. |
| AC-06 | Edit kategori | Ubah nama, deskripsi, harga, atau status aktif kategori. | Perubahan tersimpan dan ditampilkan pada katalog. |
| AC-07 | Hapus kategori | Hapus kategori yang belum digunakan transaksi. | Kategori terhapus setelah konfirmasi. |
| AC-08 | Proteksi kategori | Coba hapus kategori yang sudah dirujuk transaksi. | Sistem menolak penghapusan dan menyarankan kategori dinonaktifkan. |
| AC-09 | Tambah nasabah | Tambahkan nasabah masyarakat atau UMKM dengan nomor WhatsApp opsional. | Data nasabah tampil pada daftar. |
| AC-10 | Edit nasabah | Ubah nama, jenis pengguna, atau nomor WhatsApp. | Perubahan tersimpan dan ditampilkan. |
| AC-11 | Proteksi nasabah | Coba hapus nasabah yang memiliki transaksi. | Sistem menolak penghapusan agar riwayat tetap utuh. |
| AC-12 | Nomor WhatsApp pengelola | Atur nomor pengelola dengan format `08xxxxxxxxxx`. | Nomor tersimpan dan ditampilkan dalam format internasional; tombol chat muncul. |
| AC-13 | Ganti WhatsApp pengelola | Buka pengaturan lagi dan masukkan nomor berbeda. | Nomor baru menggantikan nomor sebelumnya setelah disimpan. |
| AC-14 | Link WhatsApp | Klik tombol/link chat ketika nomor sudah tersedia. | Browser membuka tautan WhatsApp ke nomor ternormalisasi; aplikasi tidak mengirim pesan otomatis. |
| AC-15 | Pilih kategori setoran | Buka Ajukan Setoran dan klik kartu kategori yang berbeda. | Kartu terpilih mendapat penanda aktif dan ID kategori terpilih ikut berubah. |
| AC-16 | Estimasi berat | Isi berat nol atau negatif. | Sistem menolak pengajuan; berat positif diterima. |
| AC-17 | Upload lampiran | Pilih satu gambar atau dokumen yang didukung. | Nama dan ukuran lampiran tampil pada pratinjau. |
| AC-18 | Batas upload | Pilih lebih dari tiga file atau total lebih dari 1,25 MB. | Sistem menolak pilihan lampiran dan menampilkan pesan. |
| AC-19 | Hapus lampiran terpilih | Klik Hapus semua lampiran sebelum mengirim. | Semua lampiran terpilih dibersihkan dari formulir. |
| AC-20 | Ajukan setoran | Kirim formulir dengan nasabah, kategori, tanggal, dan estimasi valid. | Transaksi baru tersimpan dengan status `menunggu`, total nilai nol, dan belum mengubah saldo. |
| AC-21 | Verifikasi setoran | Buka transaksi menunggu, masukkan berat aktual dan harga valid. | Nilai setoran dihitung, harga tersimpan sebagai snapshot, status menjadi `diverifikasi`. |
| AC-22 | Verifikasi dan lampiran | Buka verifikasi transaksi yang memiliki lampiran. | Pengelola dapat melihat gambar atau mengunduh dokumen. |
| AC-23 | Validasi berat/harga aktual | Masukkan nilai negatif pada verifikasi. | Sistem menolak input. Nilai nol diperbolehkan sesuai aturan `>= 0`. |
| AC-24 | Perhitungan nilai | Verifikasi berat aktual 2,5 kg dengan harga Rp2.000/kg. | Total nilai menjadi Rp5.000. |
| AC-25 | Snapshot harga | Verifikasi transaksi, lalu ubah harga kategori. | Harga dan nilai transaksi lama tidak berubah. |
| AC-26 | Selesaikan setoran | Selesaikan transaksi diverifikasi dan konfirmasi. | Status menjadi `selesai`, saldo nasabah bertambah sesuai total nilai. |
| AC-27 | Pencegahan saldo ganda | Coba proses ulang transaksi yang sudah selesai. | Transaksi tidak menambah saldo untuk kedua kalinya. |
| AC-28 | Pembatalan | Batalkan transaksi menunggu atau diverifikasi. | Status menjadi `dibatalkan` dan saldo tidak bertambah. |
| AC-29 | Riwayat transaksi | Buka Riwayat dan gunakan pencarian/filter status. | Data yang tampil sesuai kata pencarian dan status yang dipilih. |
| AC-30 | Dashboard setelah transaksi | Selesaikan sebuah transaksi. | Total berat, total nilai, komposisi, status, dan transaksi terbaru diperbarui. |
| AC-31 | Detail transaksi | Buka detail transaksi. | Detail nasabah, kategori, berat, harga, total, status, kontak, dan lampiran (jika ada) ditampilkan. |
| AC-32 | Persistensi | Buat perubahan, muat ulang halaman. | Data yang berhasil disimpan tetap tersedia pada browser yang sama. |
| AC-33 | Gagal simpan | Simulasikan ruang penyimpanan browser tidak cukup. | Sistem menampilkan pesan kegagalan dan tidak menampilkan perubahan sebagai data tersimpan. |
| AC-34 | Responsif | Uji tampilan desktop dan lebar mobile. | Navigasi, kartu, tabel, formulir, dan modal tetap dapat digunakan tanpa layout pecah. |

## 11. Struktur Halaman dan Navigasi

```text
SIRKULA
├── Dashboard
│   ├── Ringkasan statistik
│   ├── Komposisi sampah per kategori
│   ├── Ringkasan antrean status
│   └── Transaksi terbaru
│
├── Kategori Sampah
│   ├── Daftar kategori
│   ├── Tambah kategori
│   ├── Edit kategori
│   └── Hapus/nonaktifkan kategori
│
├── Data Nasabah
│   ├── Daftar nasabah dan saldo
│   ├── Tambah nasabah
│   ├── Edit nasabah dan WhatsApp
│   └── Hapus nasabah (jika belum memiliki transaksi)
│
├── Setoran Sampah
│   ├── Form pengajuan
│   │   ├── Pilih nasabah
│   │   ├── Pilih kategori
│   │   ├── Estimasi berat dan tanggal
│   │   ├── Catatan
│   │   └── Upload lampiran
│   ├── Antrean menunggu
│   ├── Verifikasi dan input penimbangan
│   ├── Selesaikan setoran
│   └── Batalkan setoran
│
└── Riwayat Transaksi
    ├── Pencarian
    ├── Filter status
    └── Detail transaksi dan lampiran

Header aplikasi
├── Tombol atur/ganti WhatsApp pengelola
├── Link chat WhatsApp pengelola (jika nomor tersedia)
└── Identitas mode demonstrasi
```

### 11.1 Struktur file prototype

Prototype V3 dikemas dalam satu file HTML mandiri:

```text
SIRKULA-prototype-v3.html
```

Struktur pengembangan yang disarankan setelah latihan satu hari:

```text
sirkula/
├── index.html
├── package.json
├── src/
│   ├── main.js
│   ├── styles/
│   │   └── main.css
│   ├── data/
│   │   ├── seed.js
│   │   └── storage.js
│   ├── modules/
│   │   ├── dashboard.js
│   │   ├── waste-types.js
│   │   ├── customers.js
│   │   ├── deposits.js
│   │   └── whatsapp.js
│   └── utils/
│       ├── format.js
│       └── validation.js
└── SPEC.md
```

Struktur Vite tersebut merupakan arahan refactor, bukan struktur yang wajib ada pada file single HTML saat ini.

## 12. Implementation Plan per Iterasi — Target 1 Hari

Estimasi berikut mengasumsikan satu developer pemula, data contoh sudah tersedia, dan tidak ada integrasi backend.

| Iterasi | Pekerjaan | Hasil yang diharapkan | Estimasi |
|---|---|---|---:|
| 1 | Setup proyek/HTML, layout utama, tema, navigasi responsif | Kerangka halaman SIRKULA dan perpindahan halaman | 60 menit |
| 2 | Model data, seed data, helper format, localStorage | Data awal tampil dan persistensi dasar berjalan | 45 menit |
| 3 | Katalog kategori dan CRUD | Kategori dapat ditambah, diedit, dinonaktifkan, dan dihapus sesuai aturan | 45 menit |
| 4 | Data nasabah dan CRUD | Daftar nasabah, jenis pengguna, saldo, dan nomor WhatsApp dapat dikelola | 45 menit |
| 5 | Form pengajuan, pilihan kategori, dan upload lampiran | Pengajuan tersimpan dengan status menunggu | 75 menit |
| 6 | Verifikasi, snapshot harga, kalkulasi, penyelesaian, dan pembatalan | Siklus transaksi dan penambahan saldo berjalan sesuai aturan | 90 menit |
| 7 | Dashboard, komposisi, pencarian, filter, dan riwayat | Ringkasan dan riwayat berubah mengikuti transaksi | 60 menit |
| 8 | WhatsApp pengelola/nasabah dan validasi link | Nomor dapat diatur dan link chat terbuka dengan benar | 30 menit |
| 9 | Pengujian acceptance criteria, perbaikan bug, dan dokumentasi | Prototype siap didemonstrasikan dan SPEC tersedia | 90 menit |
| | **Total estimasi** | | **8 jam** |

### Urutan prioritas jika waktu tidak mencukupi

1. Prioritaskan model data, kategori/nasabah, pengajuan, verifikasi, kalkulasi, dan saldo karena membentuk alur inti.
2. Pastikan persistensi dan validasi berjalan sebelum memperhalus tampilan.
3. Pertahankan upload dan WhatsApp sesuai batas MVP; jangan menambahkan integrasi eksternal.
4. Tunda fitur yang tercantum pada bagian Out of Scope.

---

## 13. Definition of Done

Prototype dianggap selesai untuk demonstrasi apabila:

- Semua halaman navigasi utama dapat dibuka.
- Tombol yang terlihat memiliki aksi sesuai label dan konteksnya.
- Kategori dan nasabah contoh tersedia serta dapat dikelola sesuai aturan.
- Pengajuan setoran dapat dibuat dengan kategori yang dipilih dan lampiran opsional.
- Pengelola dapat memverifikasi berat aktual dan harga.
- Nilai transaksi benar dan harga snapshot tidak berubah setelah harga kategori diperbarui.
- Saldo bertambah hanya pada penyelesaian dan tidak pernah dikreditkan dua kali untuk transaksi yang sama.
- Pembatalan tidak menambah saldo.
- Dashboard dan riwayat mencerminkan status transaksi terbaru.
- Nomor WhatsApp pengelola dan nasabah dapat diubah dan tautan WhatsApp terbentuk.
- Data yang berhasil disimpan bertahan setelah halaman dimuat ulang pada browser/perangkat yang sama.
- Tidak ada API key, kredensial, atau data pribadi nyata di dalam data contoh.
- Seluruh keterbatasan localStorage dan status simulasi dijelaskan kepada pengguna demonstrasi.

## 14. Asumsi dan Catatan Implementasi

1. Prototype dijalankan dalam satu browser pada satu perangkat. `localStorage` bukan database bersama dan tidak melakukan sinkronisasi antarperangkat.
2. Penggunaan file HTML melalui `file://` dapat memiliki perilaku penyimpanan yang berbeda antar browser. Untuk pengembangan berulang, jalankan versi proyek melalui Vite pada origin lokal yang konsisten.
3. Data simulasi harus diperiksa agar saldo awal nasabah konsisten dengan transaksi berstatus selesai sebelum digunakan sebagai skenario uji saldo.
4. Nomor WhatsApp tidak disediakan secara default dan harus dimasukkan oleh pengelola saat demonstrasi.
5. Lampiran disimpan sebagai Data URL di localStorage. Untuk versi backend, file sebaiknya dipindahkan ke penyimpanan file dan database cukup menyimpan metadata serta referensi file.
6. Tidak ada jaminan keamanan atau otorisasi setingkat aplikasi produksi. Jangan memasukkan data pribadi, dokumen sensitif, atau transaksi riil.

---

**Akhir dokumen — SIRKULA SPEC v1.0**
