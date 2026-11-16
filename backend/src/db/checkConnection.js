/**
 * Uji koneksi MySQL dan tampilkan ringkasan server + database.
 * Jalankan: npm run db:check
 */
import { pool, testConnection } from '../config/db.js';
import { env } from '../config/env.js';

async function main() {
  console.log(`Menghubungkan ke MySQL ${env.db.host}:${env.db.port} sebagai "${env.db.user}" ...`);
  const info = await testConnection();
  console.log('✔ Koneksi database berhasil.');
  console.log(`  Server   : ${info.version}`);
  console.log(`  Database : ${info.database}`);
  console.log(`  Tabel    : ${info.tables.length ? info.tables.join(', ') : '(belum ada — jalankan npm run db:migrate)'}`);

  const [rows] = await pool.query(
    `SELECT table_name AS name, table_rows AS approxRows
       FROM information_schema.tables
      WHERE table_schema = ? AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
    [env.db.name],
  );
  if (rows.length) {
    console.table(rows.map((row) => ({ tabel: row.name, 'perkiraan baris': Number(row.approxRows) })));
  }
}

main()
  .catch((error) => {
    console.error('✖ Koneksi database gagal.');
    console.error(`  Kode   : ${error.code || '-'}`);
    console.error(`  Pesan  : ${error.message}`);
    console.error('  Periksa DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, dan DB_NAME pada backend/.env.');
    process.exitCode = 1;
  })
  .finally(() => pool.end());
