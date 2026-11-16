import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';

const app = createApp();

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log(`Terhubung ke database MySQL "${env.db.database}" pada ${env.db.host}:${env.db.port}.`);
  } catch (error) {
    console.error('Tidak dapat terhubung ke MySQL:', error.message);
    console.error('Periksa konfigurasi .env lalu jalankan `npm run db:migrate` dan `npm run db:seed`.');
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`SIRKULA API berjalan pada http://localhost:${env.port} (mode ${env.nodeEnv}).`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} diterima, menutup server...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
