import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const schemaPath = path.join(import.meta.dirname, 'schema.sql');

const DROP_ORDER = [
  'activity_logs',
  'balance_histories',
  'transactions',
  'deposit_attachments',
  'deposit_details',
  'deposits',
  'waste_types',
  'waste_categories',
  'app_settings',
  'bank_profiles',
  'users',
];

export async function migrate({ fresh = false, log = console.log } = {}) {
  const server = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

  try {
    await server.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await server.changeUser({ database: env.db.database });

    if (fresh) {
      log('Menghapus tabel lama...');
      await server.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const table of DROP_ORDER) {
        await server.query(`DROP TABLE IF EXISTS \`${table}\``);
      }
      await server.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    const schema = await fs.readFile(schemaPath, 'utf8');
    const statements = schema
      .split(/;\s*$/m)
      .map((statement) => statement.trim())
      .filter((statement) => statement && !statement.split('\n').every((line) => line.trim().startsWith('--')));

    for (const statement of statements) {
      await server.query(statement);
    }
    log(`Skema database "${env.db.database}" siap (${statements.length} tabel/indeks).`);
  } finally {
    await server.end();
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);

if (isDirectRun) {
  migrate({ fresh: process.argv.includes('--fresh') }).catch((error) => {
    console.error('Migrasi gagal:', error.message);
    process.exitCode = 1;
  });
}
