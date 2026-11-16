import path from 'node:path';
import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../config/db.js';
import { env } from '../config/env.js';

const DEMO_PASSWORD = env.demoPassword;

const daysAgo = (n) => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().slice(0, 10);
};

const USERS = [
  { name: 'Admin SIRKULA', email: 'admin@sirkula.id', role: 'admin', phone: '081200000001', address: 'Jl. Melati No. 1, Bandung' },
  { name: 'Bank Sampah Hijau Lestari', email: 'seller1@sirkula.id', role: 'seller', phone: '081200000002', address: 'Jl. Kenanga No. 12, Bandung' },
  { name: 'Bank Sampah Cempaka', email: 'seller2@sirkula.id', role: 'seller', phone: '081200000003', address: 'Jl. Cempaka No. 8, Bandung' },
  // 10 akun pembeli (nasabah)
  { name: 'Ayu Lestari', email: 'ayu@sirkula.id', role: 'pembeli', user_type: 'masyarakat', phone: '081211110001', whatsapp: '6281211110001', address: 'Jl. Anggrek No. 3, Bandung' },
  { name: 'Budi Santoso', email: 'budi@sirkula.id', role: 'pembeli', user_type: 'masyarakat', phone: '081211110002', whatsapp: '6281211110002', address: 'Jl. Mawar No. 7, Bandung' },
  { name: 'Kedai Kopi Pagi', email: 'kopipagi@sirkula.id', role: 'pembeli', user_type: 'umkm', phone: '081211110003', whatsapp: '6281211110003', address: 'Jl. Braga No. 21, Bandung' },
  { name: 'Dina Collection', email: 'dina@sirkula.id', role: 'pembeli', user_type: 'umkm', phone: '081211110004', whatsapp: '6281211110004', address: 'Jl. Sukajadi No. 15, Bandung' },
  { name: 'Rizky Pratama', email: 'rizky@sirkula.id', role: 'pembeli', user_type: 'masyarakat', phone: '081211110005', whatsapp: '6281211110005', address: 'Jl. Cihampelas No. 9, Bandung' },
  { name: 'Warung Bu Sari', email: 'busari@sirkula.id', role: 'pembeli', user_type: 'umkm', phone: '081211110006', whatsapp: '6281211110006', address: 'Jl. Dago No. 44, Bandung' },
  { name: 'Fajar Nugraha', email: 'fajar@sirkula.id', role: 'pembeli', user_type: 'masyarakat', phone: '081211110007', whatsapp: '6281211110007', address: 'Jl. Setiabudi No. 18, Bandung' },
  { name: 'Toko Kue Manis', email: 'kuemanis@sirkula.id', role: 'pembeli', user_type: 'umkm', phone: '081211110008', whatsapp: '6281211110008', address: 'Jl. Pasteur No. 2, Bandung' },
  { name: 'Sinta Dewi', email: 'sinta@sirkula.id', role: 'pembeli', user_type: 'masyarakat', phone: '081211110009', whatsapp: '6281211110009', address: 'Jl. Buah Batu No. 30, Bandung' },
  { name: 'CV Karya Makmur', email: 'karyamakmur@sirkula.id', role: 'pembeli', user_type: 'umkm', phone: '081211110010', whatsapp: '6281211110010', address: 'Jl. Soekarno Hatta No. 88, Bandung' },
];

const CATEGORIES = [
  {
    key: 'plastik', name: 'Plastik', icon: '♳', description: 'Botol, gelas, dan kemasan plastik bersih yang dapat didaur ulang.',
    types: [
      { key: 'pet', name: 'Botol PET Bening', price: 3200, description: 'Botol air mineral bening tanpa tutup.' },
      { key: 'hdpe', name: 'Plastik HDPE', price: 2800, description: 'Botol sabun dan jerigen keras.' },
      { key: 'plastic-mixed', name: 'Plastik Campur', price: 1800, description: 'Kemasan plastik campuran yang sudah dibersihkan.' },
    ],
  },
  {
    key: 'kertas', name: 'Kertas', icon: '▧', description: 'Kertas HVS, koran, dan majalah.',
    types: [
      { key: 'hvs', name: 'Kertas HVS', price: 1500, description: 'Kertas putih bekas cetak.' },
      { key: 'koran', name: 'Koran Bekas', price: 1200, description: 'Koran dan majalah bekas.' },
    ],
  },
  {
    key: 'kardus', name: 'Kardus', icon: '▤', description: 'Kardus dan karton kering.',
    types: [
      { key: 'kardus-coklat', name: 'Kardus Coklat', price: 2000, description: 'Kardus bekas paket dalam kondisi kering.' },
      { key: 'karton', name: 'Karton Tipis', price: 1300, description: 'Karton kemasan tipis.' },
    ],
  },
  {
    key: 'logam', name: 'Logam', icon: '▣', description: 'Kaleng, aluminium, dan logam bekas.',
    types: [
      { key: 'kaleng', name: 'Kaleng Aluminium', price: 5000, description: 'Kaleng minuman ringan.' },
      { key: 'besi', name: 'Besi Bekas', price: 3500, description: 'Potongan besi dan paku bekas.' },
    ],
  },
  {
    key: 'kaca', name: 'Kaca', icon: '◈', description: 'Botol kaca dan pecahan kaca bersih.',
    types: [
      { key: 'botol-kaca', name: 'Botol Kaca', price: 900, description: 'Botol kecap, sirup, dan saus.' },
    ],
  },
  {
    key: 'minyak', name: 'Minyak Jelantah', icon: '◐', description: 'Minyak goreng bekas rumah tangga dan UMKM.',
    types: [
      { key: 'jelantah', name: 'Minyak Jelantah', price: 4000, description: 'Minyak goreng bekas yang sudah disaring.' },
      { key: 'jelantah-jernih', name: 'Jelantah Jernih', price: 4800, description: 'Minyak jelantah jernih tanpa endapan.' },
    ],
  },
];

const DEPOSITS = [
  { buyer: 3, seller: 0, type: 'pet', estimated: 8.5, actual: 8.2, status: 'selesai', day: 24, notes: 'Botol plastik bersih dari rumah.' },
  { buyer: 4, seller: 0, type: 'kardus-coklat', estimated: 12, actual: 11.4, status: 'selesai', day: 22, notes: 'Kardus bekas belanja online.' },
  { buyer: 5, seller: 0, type: 'jelantah', estimated: 15, actual: 14.6, status: 'selesai', day: 21, notes: 'Minyak goreng bekas kedai.' },
  { buyer: 6, seller: 1, type: 'hvs', estimated: 9, actual: 8.7, status: 'selesai', day: 20, notes: 'Kertas arsip toko.' },
  { buyer: 7, seller: 0, type: 'kaleng', estimated: 6, actual: 5.8, status: 'selesai', day: 18, notes: 'Kaleng minuman.' },
  { buyer: 8, seller: 1, type: 'jelantah-jernih', estimated: 20, actual: 19.5, status: 'selesai', day: 16, notes: 'Jelantah warung, sudah disaring.' },
  { buyer: 9, seller: 0, type: 'kardus-coklat', estimated: 10, actual: 9.6, status: 'selesai', day: 14, notes: 'Kardus pengemasan kue.' },
  { buyer: 10, seller: 1, type: 'pet', estimated: 7.5, actual: 7.1, status: 'selesai', day: 12, notes: 'Botol plastik dari kegiatan kantor.' },
  { buyer: 11, seller: 0, type: 'hdpe', estimated: 5, actual: 4.8, status: 'selesai', day: 9, notes: 'Jerigen bekas sabun.' },
  { buyer: 12, seller: 1, type: 'besi', estimated: 25, actual: 24.2, status: 'selesai', day: 7, notes: 'Besi sisa produksi.' },
  { buyer: 3, seller: 0, type: 'hvs', estimated: 4, status: 'menunggu', day: 3, notes: 'Kertas HVS bekas cetak.' },
  { buyer: 7, seller: 1, type: 'botol-kaca', estimated: 6.5, status: 'menunggu', day: 2, notes: 'Botol kaca kecap.' },
  { buyer: 8, seller: 0, type: 'plastic-mixed', estimated: 11, status: 'menunggu', day: 2, notes: 'Plastik kemasan warung.' },
  { buyer: 10, seller: 1, type: 'koran', estimated: 3.5, status: 'menunggu', day: 1, notes: 'Koran bekas.' },
  { buyer: 5, seller: 0, type: 'pet', estimated: 9, actual: 8.6, price: 3200, status: 'diverifikasi', day: 4, notes: 'Botol PET dari kedai.' },
  { buyer: 6, seller: 1, type: 'kardus-coklat', estimated: 14, actual: 13.2, price: 2000, status: 'diverifikasi', day: 4, notes: 'Kardus toko pakaian.' },
  { buyer: 11, seller: 0, type: 'kaleng', estimated: 4, actual: 3.7, price: 5000, status: 'diverifikasi', day: 3, notes: 'Kaleng minuman.' },
  { buyer: 9, seller: 1, type: 'jelantah', estimated: 8, status: 'dibatalkan', day: 11, notes: 'Dibatalkan karena jadwal berubah.' },
  { buyer: 4, seller: 0, type: 'hvs', estimated: 5, status: 'dibatalkan', day: 8, notes: 'Nasabah tidak datang.' },
  { buyer: 12, seller: 1, type: 'botol-kaca', estimated: 12, status: 'dibatalkan', day: 5, notes: 'Kaca pecah saat pengangkutan.' },
];

async function seed() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await withTransaction(async (conn) => {
    // Bersihkan data lama (urutan mengikuti foreign key).
    for (const table of [
      'activity_logs', 'balance_histories', 'transactions', 'deposit_attachments',
      'deposit_details', 'deposits', 'waste_types', 'waste_categories',
      'app_settings', 'bank_profiles', 'users',
    ]) {
      await conn.query(`DELETE FROM \`${table}\``);
    }
    await conn.query('ALTER TABLE users AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE deposits AUTO_INCREMENT = 1');

    const userIds = [];
    for (const user of USERS) {
      const [result] = await conn.execute(
        `INSERT INTO users (name, email, password_hash, role, user_type, phone, whatsapp, address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.name,
          user.email,
          passwordHash,
          user.role,
          user.user_type || 'masyarakat',
          user.phone || null,
          user.whatsapp || null,
          user.address || null,
        ],
      );
      userIds.push(result.insertId);
    }
    const [adminId, seller1Id, seller2Id] = userIds;
    const sellerIds = [seller1Id, seller2Id];
    const buyerIds = userIds.slice(3);

    await conn.execute(
      `INSERT INTO bank_profiles (seller_id, name, address, whatsapp, description, opening_hours) VALUES
       (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)`,
      [
        seller1Id, 'Bank Sampah Hijau Lestari', 'Jl. Kenanga No. 12, Bandung', '6281200000002',
        'Bank sampah komunitas yang melayani setoran rumah tangga dan UMKM sejak 2019.',
        'Senin–Sabtu, 08.00–16.00',
        seller2Id, 'Bank Sampah Cempaka', 'Jl. Cempaka No. 8, Bandung', '6281200000003',
        'Bank sampah mitra UMKM dengan layanan penimbangan dan pencatatan digital.',
        'Senin–Jumat, 09.00–17.00',
      ],
    );

    await conn.execute(
      `INSERT INTO app_settings (setting_key, setting_value) VALUES
       ('app_name', 'SIRKULA'),
       ('app_tagline', 'Bank Sampah Digital'),
       ('whatsapp_pengelola', '6281200000002'),
       ('deposit_instructions', 'Pisahkan sampah sesuai kategori, bersihkan dari sisa makanan, lalu ajukan setoran melalui aplikasi. Pengelola akan menghubungi Anda untuk penimbangan.')`,
    );

    const typeIdByKey = new Map();
    for (const category of CATEGORIES) {
      const [catResult] = await conn.execute(
        'INSERT INTO waste_categories (name, icon, description, created_by) VALUES (?, ?, ?, ?)',
        [category.name, category.icon, category.description, adminId],
      );
      for (const type of category.types) {
        const [typeResult] = await conn.execute(
          'INSERT INTO waste_types (category_id, name, price_per_kg, description, created_by) VALUES (?, ?, ?, ?, ?)',
          [catResult.insertId, type.name, type.price, type.description, adminId],
        );
        typeIdByKey.set(type.key, { id: typeResult.insertId, price: type.price, name: type.name, categoryName: category.name });
      }
    }

    let index = 0;
    for (const deposit of DEPOSITS) {
      index += 1;
      const type = typeIdByKey.get(deposit.type);
      if (!type) throw new Error(`Jenis sampah tidak dikenal pada seeder: ${deposit.type}`);
      const price = type.price;
      const actual = deposit.actual ?? null;
      const total = actual === null ? 0 : Math.round(actual * price);
      const credited = deposit.status === 'selesai' ? 1 : 0;

      const [depositResult] = await conn.execute(
        `INSERT INTO deposits
          (code, buyer_id, seller_id, deposit_date, status, total_value, notes, balance_credited,
           verified_by, verified_at, completed_at, cancelled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `S-${1000 + index}`,
          buyerIds[deposit.buyer - 3],
          sellerIds[deposit.seller],
          daysAgo(deposit.day),
          deposit.status,
          total,
          deposit.notes,
          credited,
          deposit.status === 'selesai' ? sellerIds[deposit.seller] : deposit.status === 'diverifikasi' ? sellerIds[deposit.seller] : null,
          ['diverifikasi', 'selesai'].includes(deposit.status) ? new Date(Date.now() - (deposit.day - 1) * 86400000) : null,
          deposit.status === 'selesai' ? new Date(Date.now() - (deposit.day - 2) * 86400000) : null,
          deposit.status === 'dibatalkan' ? new Date(Date.now() - deposit.day * 86400000) : null,
        ],
      );

      await conn.execute(
        `INSERT INTO deposit_details
          (deposit_id, waste_type_id, category_name_snapshot, waste_name_snapshot,
           estimated_weight, actual_weight, price_per_kg, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          depositResult.insertId,
          type.id,
          type.categoryName,
          type.name,
          deposit.estimated,
          actual,
          actual === null ? null : price,
          total,
        ],
      );

      if (deposit.status === 'selesai') {
        await conn.execute(
          'INSERT INTO transactions (deposit_id, buyer_id, seller_id, amount) VALUES (?, ?, ?, ?)',
          [depositResult.insertId, buyerIds[deposit.buyer - 3], sellerIds[deposit.seller], total],
        );
        const [beforeRows] = await conn.execute('SELECT balance FROM users WHERE id = ? FOR UPDATE', [
          buyerIds[deposit.buyer - 3],
        ]);
        const before = Number(beforeRows[0].balance);
        const after = before + total;
        await conn.execute('UPDATE users SET balance = ? WHERE id = ?', [after, buyerIds[deposit.buyer - 3]]);
        await conn.execute(
          `INSERT INTO balance_histories
            (user_id, deposit_id, type, amount, balance_before, balance_after, description, created_by)
           VALUES (?, ?, 'credit', ?, ?, ?, ?, ?)`,
          [buyerIds[deposit.buyer - 3], depositResult.insertId, total, before, after, `Setoran ${`S-${1000 + index}`} selesai`, sellerIds[deposit.seller]],
        );
      }
    }

    const logs = [
      [adminId, 'system.seed', 'system', null, 'Data demonstrasi dimuat ke database'],
      [adminId, 'settings.update', 'app_settings', null, 'Nomor WhatsApp pengelola diperbarui'],
      [seller1Id, 'deposit.verify', 'deposit', 'S-1015', 'Verifikasi setoran S-1015'],
      [seller2Id, 'deposit.complete', 'deposit', 'S-1010', 'Setoran S-1010 diselesaikan dan saldo dikreditkan'],
      [seller1Id, 'waste_type.update', 'waste_type', '1', 'Harga Botol PET Bening diperbarui'],
      [buyerIds[0], 'deposit.create', 'deposit', 'S-1011', 'Pengajuan setoran baru dibuat'],
      [adminId, 'user.create', 'user', String(seller2Id), 'Akun pengelola bank sampah dibuat'],
    ];
    for (const [userId, action, entity, entityId, description] of logs) {
      await conn.execute(
        'INSERT INTO activity_logs (user_id, action, entity, entity_id, description, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, action, entity, entityId, description, '127.0.0.1'],
      );
    }
  });

  const [[counts]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM users) AS users,
            (SELECT COUNT(*) FROM deposits) AS deposits,
            (SELECT COUNT(*) FROM waste_types) AS waste_types`,
  );
  console.log(`Seeder selesai: ${counts.users} pengguna, ${counts.deposits} setoran, ${counts.waste_types} jenis sampah.`);
  console.log(`Akun demo: admin@sirkula.id / ${DEMO_PASSWORD}`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);

if (isDirectRun) {
  seed()
    .then(() => pool.end())
    .catch(async (error) => {
      console.error('Seeder gagal:', error.message);
      await pool.end();
      process.exitCode = 1;
    });
}

export { seed };
