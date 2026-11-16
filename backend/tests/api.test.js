/**
 * Pengujian integrasi REST API SIRKULA.
 * Berjalan pada database terpisah (default: sirkula_test) yang dibuat ulang setiap kali test dijalankan.
 */
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'sirkula_test';
process.env.JWT_SECRET = 'test-secret-0123456789-abcdefghijklmnop';
process.env.DEMO_PASSWORD = 'Sirkula#2026';
process.env.COOKIE_SECURE = 'false';

const { test, before, after } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const request = (await import('supertest')).default;
const { migrate } = await import('../src/db/migrate.js');
const { seed } = await import('../src/db/seed.js');
const { createApp } = await import('../src/app.js');
const { closePool, query } = await import('../src/config/db.js');

const PASSWORD = 'Sirkula#2026';
const app = createApp();

const login = async (email) => {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  assert.equal(response.status, 200, `login ${email} gagal: ${response.text}`);
  return agent;
};

let admin;
let seller;
let seller2;
let buyer;
let buyer2;

before(async () => {
  await migrate({ fresh: true, log: () => {} });
  await seed();
  admin = await login('admin@sirkula.id');
  seller = await login('seller1@sirkula.id');
  seller2 = await login('seller2@sirkula.id');
  buyer = await login('ayu@sirkula.id');
  buyer2 = await login('budi@sirkula.id');
});

after(async () => {
  await closePool();
});

test('endpoint publik dapat diakses tanpa login', async () => {
  const response = await request(app).get('/api/public/info');
  assert.equal(response.status, 200);
  assert.equal(response.body.data.settings.appName, 'SIRKULA');
  assert.ok(response.body.data.banks.length >= 2);
  assert.match(response.body.data.banks[0].whatsapp, /^62/);
});

test('katalog harga dapat dibaca semua role', async () => {
  const response = await buyer.get('/api/waste-types?onlyActive=true');
  assert.equal(response.status, 200);
  assert.ok(response.body.data.length >= 12);
});

test('guest ditolak pada endpoint terproteksi', async () => {
  const response = await request(app).get('/api/dashboard');
  assert.equal(response.status, 401);
});

test('pembeli tidak dapat mengakses manajemen pengguna', async () => {
  const response = await buyer.get('/api/users');
  assert.equal(response.status, 403);
});

test('seller tidak dapat mengelola pengguna dan pengaturan', async () => {
  assert.equal((await seller.get('/api/users')).status, 403);
  assert.equal((await seller.get('/api/settings')).status, 403);
});

test('admin dapat membuat, mengubah, menonaktifkan, dan menghapus pengguna', async () => {
  const created = await admin.post('/api/users').send({
    name: 'Nasabah Uji Coba',
    email: 'uji.coba@sirkula.id',
    password: 'Rahasia#123',
    role: 'pembeli',
    userType: 'masyarakat',
    whatsapp: '081298765432',
  });
  assert.equal(created.status, 201, created.text);
  const userId = created.body.data.user.id;
  assert.equal(created.body.data.user.whatsapp, '6281298765432');

  const updated = await admin.patch(`/api/users/${userId}`).send({ name: 'Nasabah Uji Coba 2', role: 'pembeli' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.user.name, 'Nasabah Uji Coba 2');

  const deactivated = await admin.patch(`/api/users/${userId}/active`).send({ isActive: false });
  assert.equal(deactivated.status, 200);
  const blockedLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'uji.coba@sirkula.id', password: 'Rahasia#123' });
  assert.equal(blockedLogin.status, 403);

  await admin.patch(`/api/users/${userId}/active`).send({ isActive: true });
  const removed = await admin.delete(`/api/users/${userId}`);
  assert.equal(removed.status, 200);
});

test('pengguna dengan riwayat setoran tidak dapat dihapus', async () => {
  const response = await admin.delete('/api/users/4');
  assert.equal(response.status, 409);
});

test('validasi input menolak harga negatif dan email duplikat', async () => {
  const negative = await seller.post('/api/waste-types').send({
    categoryId: 1, name: 'Jenis Negatif', pricePerKg: -100,
  });
  assert.equal(negative.status, 400);

  const duplicate = await request(app).post('/api/auth/register').send({
    name: 'Duplikat',
    email: 'ayu@sirkula.id',
    password: 'Rahasia#123',
  });
  assert.equal(duplicate.status, 409);
});

test('seller dapat mengelola kategori dan jenis sampah', async () => {
  const category = await seller.post('/api/categories').send({
    name: 'Tekstil', icon: '◫', description: 'Kain dan pakaian bekas',
  });
  assert.equal(category.status, 201, category.text);
  const categoryId = category.body.data.category.id;

  const type = await seller.post('/api/waste-types').send({
    categoryId, name: 'Kain Katun', pricePerKg: 2200, unit: 'kg', description: 'Kain katun bersih',
  });
  assert.equal(type.status, 201, type.text);
  assert.equal(type.body.data.type.pricePerKg, 2200);

  const updated = await seller.put(`/api/waste-types/${type.body.data.type.id}`).send({
    categoryId, name: 'Kain Katun', pricePerKg: 2500, isActive: false,
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.type.isActive, 0);

  const deleted = await seller.delete(`/api/waste-types/${type.body.data.type.id}`);
  assert.equal(deleted.status, 200);
  assert.equal((await seller.delete(`/api/categories/${categoryId}`)).status, 200);
});

test('kategori yang sudah dipakai transaksi tidak dapat dihapus', async () => {
  const response = await seller.delete('/api/categories/1');
  assert.equal(response.status, 409);
  assert.match(response.body.message, /transaksi/i);
});

test('pembeli hanya melihat setoran miliknya sendiri', async () => {
  const mine = await buyer.get('/api/deposits');
  assert.equal(mine.status, 200);
  assert.ok(mine.body.data.rows.every((row) => row.buyerId === 4));

  const otherDeposit = mine.body.data.rows[0].id;
  const denied = await buyer2.get(`/api/deposits/${otherDeposit}`);
  assert.equal(denied.status, 403);
});

test('seller hanya melihat setoran bank sampahnya sendiri', async () => {
  const response = await seller.get('/api/deposits?limit=100');
  assert.equal(response.status, 200);
  assert.ok(response.body.data.rows.length > 0);
  assert.ok(response.body.data.rows.every((row) => row.sellerId === 2));

  const foreign = response.body.data.rows[0].id;
  const denied = await seller2.patch(`/api/deposits/${foreign}/complete`).send({});
  assert.equal(denied.status, 403);
});

test('alur lengkap: ajukan, verifikasi, snapshot harga, selesaikan, saldo hanya sekali', async () => {
  const me = await buyer.get('/api/auth/me');
  const balanceBefore = Number(me.body.data.user.balance);

  const created = await buyer.post('/api/deposits').send({
    sellerId: 2,
    depositDate: new Date().toISOString().slice(0, 10),
    notes: 'Uji alur lengkap',
    items: [{ wasteTypeId: 1, estimatedWeight: 2.5 }],
  });
  assert.equal(created.status, 201, created.text);
  const deposit = created.body.data.deposit;
  assert.equal(deposit.status, 'menunggu');
  assert.equal(deposit.totalValue, 0);
  assert.match(deposit.code, /^S-\d+$/);
  assert.equal(deposit.details.length, 1);

  const verified = await seller.patch(`/api/deposits/${deposit.id}/verify`).send({
    items: [{ detailId: deposit.details[0].id, actualWeight: 2.5, pricePerKg: 2000 }],
    managerNotes: 'Ditimbang di kantor',
  });
  assert.equal(verified.status, 200, verified.text);
  assert.equal(verified.body.data.deposit.status, 'diverifikasi');
  assert.equal(verified.body.data.deposit.totalValue, 5000);
  assert.equal(verified.body.data.deposit.details[0].pricePerKg, 2000);

  // Perubahan harga kategori tidak boleh mengubah transaksi lama.
  const typeBefore = (await seller.get('/api/waste-types?onlyActive=true')).body.data.find((row) => row.id === 1);
  await seller.put('/api/waste-types/1').send({
    categoryId: typeBefore.categoryId,
    name: typeBefore.name,
    pricePerKg: 9000,
  });
  const afterPriceChange = await buyer.get(`/api/deposits/${deposit.id}`);
  assert.equal(afterPriceChange.body.data.deposit.totalValue, 5000);
  await seller.put('/api/waste-types/1').send({
    categoryId: typeBefore.categoryId,
    name: typeBefore.name,
    pricePerKg: typeBefore.pricePerKg,
  });

  const completed = await seller.patch(`/api/deposits/${deposit.id}/complete`).send({});
  assert.equal(completed.status, 200, completed.text);
  assert.equal(completed.body.data.deposit.status, 'selesai');
  assert.equal(completed.body.data.deposit.alreadyCompleted, false);

  const afterBalance = Number((await buyer.get('/api/auth/me')).body.data.user.balance);
  assert.equal(afterBalance, balanceBefore + 5000);

  // Proses ulang harus idempoten.
  const repeated = await seller.patch(`/api/deposits/${deposit.id}/complete`).send({});
  assert.equal(repeated.status, 200);
  assert.equal(repeated.body.data.deposit.alreadyCompleted, true);
  const finalBalance = Number((await buyer.get('/api/auth/me')).body.data.user.balance);
  assert.equal(finalBalance, afterBalance);

  const transactions = await query('SELECT COUNT(*) AS total FROM transactions WHERE deposit_id = ?', [deposit.id]);
  assert.equal(Number(transactions[0].total), 1);
  const histories = await query('SELECT COUNT(*) AS total FROM balance_histories WHERE deposit_id = ?', [deposit.id]);
  assert.equal(Number(histories[0].total), 1);
});

test('pembatalan tidak menambah saldo', async () => {
  const balanceBefore = Number((await buyer.get('/api/auth/me')).body.data.user.balance);
  const created = await buyer.post('/api/deposits').send({
    sellerId: 2,
    depositDate: new Date().toISOString().slice(0, 10),
    items: [{ wasteTypeId: 3, estimatedWeight: 1 }],
  });
  const id = created.body.data.deposit.id;

  const cancelled = await seller.patch(`/api/deposits/${id}/cancel`).send({ reason: 'Nasabah berhalangan' });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.data.deposit.status, 'dibatalkan');

  const balanceAfter = Number((await buyer.get('/api/auth/me')).body.data.user.balance);
  assert.equal(balanceAfter, balanceBefore);

  const complete = await seller.patch(`/api/deposits/${id}/complete`).send({});
  assert.equal(complete.status, 409);
});

test('verifikasi menolak berat negatif dan harga negatif', async () => {
  const created = await buyer.post('/api/deposits').send({
    sellerId: 2,
    depositDate: new Date().toISOString().slice(0, 10),
    items: [{ wasteTypeId: 2, estimatedWeight: 1 }],
  });
  const deposit = created.body.data.deposit;

  const negativeWeight = await seller.patch(`/api/deposits/${deposit.id}/verify`).send({
    items: [{ detailId: deposit.details[0].id, actualWeight: -1, pricePerKg: 1000 }],
  });
  assert.equal(negativeWeight.status, 400);

  const negativePrice = await seller.patch(`/api/deposits/${deposit.id}/verify`).send({
    items: [{ detailId: deposit.details[0].id, actualWeight: 1, pricePerKg: -1000 }],
  });
  assert.equal(negativePrice.status, 400);

  const zeroAllowed = await seller.patch(`/api/deposits/${deposit.id}/verify`).send({
    items: [{ detailId: deposit.details[0].id, actualWeight: 0, pricePerKg: 0 }],
  });
  assert.equal(zeroAllowed.status, 200);
  assert.equal(zeroAllowed.body.data.deposit.totalValue, 0);
});

test('estimasi berat nol ditolak saat pengajuan', async () => {
  const response = await buyer.post('/api/deposits').send({
    sellerId: 2,
    depositDate: new Date().toISOString().slice(0, 10),
    items: [{ wasteTypeId: 1, estimatedWeight: 0 }],
  });
  assert.equal(response.status, 400);
});

test('lampiran dapat diunggah dan hanya diakses pemilik serta pengelola', async () => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  const created = await buyer
    .post('/api/deposits')
    .field('sellerId', '2')
    .field('depositDate', new Date().toISOString().slice(0, 10))
    .field('items', JSON.stringify([{ wasteTypeId: 1, estimatedWeight: 1 }]))
    .attach('attachments', png, { filename: 'bukti.png', contentType: 'image/png' });
  assert.equal(created.status, 201, created.text);
  const deposit = created.body.data.deposit;
  assert.equal(deposit.attachments.length, 1);

  const attachmentId = deposit.attachments[0].id;
  assert.equal((await buyer.get(`/api/deposits/attachments/${attachmentId}`)).status, 200);
  assert.equal((await seller.get(`/api/deposits/attachments/${attachmentId}`)).status, 200);
  assert.equal((await buyer2.get(`/api/deposits/attachments/${attachmentId}`)).status, 403);
});

test('format lampiran berbahaya ditolak', async () => {
  const response = await buyer
    .post('/api/deposits')
    .field('sellerId', '2')
    .field('depositDate', new Date().toISOString().slice(0, 10))
    .field('items', JSON.stringify([{ wasteTypeId: 1, estimatedWeight: 1 }]))
    .attach('attachments', Buffer.from('<script>alert(1)</script>'), {
      filename: 'jahat.html',
      contentType: 'text/html',
    });
  assert.equal(response.status, 400);
});

test('dashboard dan laporan mengikuti role', async () => {
  const dashboard = await seller.get('/api/dashboard');
  assert.equal(dashboard.status, 200, dashboard.text);
  assert.equal(dashboard.body.data.role, 'seller');
  assert.ok(dashboard.body.data.stats.totalCustomers > 0);

  assert.equal((await buyer.get('/api/reports')).status, 403);

  const report = await seller.get('/api/reports');
  assert.equal(report.status, 200, report.text);
  assert.ok(Array.isArray(report.body.data.byCategory));

  const adminReport = await admin.get('/api/reports');
  assert.equal(adminReport.status, 200);
});

test('pengaturan WhatsApp dinormalisasi dan tersedia publik', async () => {
  const saved = await admin.put('/api/settings').send({ whatsappPengelola: '081234567890' });
  assert.equal(saved.status, 200, saved.text);
  assert.equal(saved.body.data.settings.whatsappPengelola, '6281234567890');

  const publicInfo = await request(app).get('/api/public/info');
  assert.equal(publicInfo.body.data.settings.whatsappPengelola, '6281234567890');

  const invalid = await admin.put('/api/settings').send({ whatsappPengelola: '123' });
  assert.equal(invalid.status, 400);
});

test('riwayat saldo hanya dapat dilihat pemilik, pengelola terkait, dan admin', async () => {
  assert.equal((await buyer.get('/api/balance')).status, 200);
  assert.equal((await buyer.get('/api/balance/5')).status, 403);
  assert.equal((await admin.get('/api/balance/5')).status, 200);
  const sellerView = await seller.get('/api/balance/5');
  assert.equal(sellerView.status, 200);
});

test('log aktivitas hanya untuk admin', async () => {
  assert.equal((await seller.get('/api/activity-logs')).status, 403);
  const response = await admin.get('/api/activity-logs?limit=5');
  assert.equal(response.status, 200);
  assert.ok(response.body.data.rows.length > 0);
});

test('logout menghapus sesi', async () => {
  const agent = await login('sinta@sirkula.id');
  assert.equal((await agent.get('/api/dashboard')).status, 200);
  await agent.post('/api/auth/logout');
  assert.equal((await agent.get('/api/dashboard')).status, 401);
});

test('data tetap tersedia setelah login ulang (persistensi database)', async () => {
  const fresh = await login('ayu@sirkula.id');
  const response = await fresh.get('/api/deposits?limit=5');
  assert.equal(response.status, 200);
  assert.ok(response.body.data.rows.length > 0);
});
