import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  connectionLimit: env.db.connectionLimit,
  waitForConnections: true,
  queueLimit: 0,
  dateStrings: ['DATE'],
  decimalNumbers: true,
  charset: 'utf8mb4_unicode_ci',
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function testConnection() {
  const connection = await pool.getConnection();
  try {
    const [info] = await connection.query('SELECT VERSION() AS version, DATABASE() AS `database`');
    const [tables] = await connection.query('SHOW TABLES');
    return {
      version: info[0].version,
      database: info[0].database,
      tables: tables.map((row) => Object.values(row)[0]),
    };
  } finally {
    connection.release();
  }
}

export async function withTransaction(fn) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function closePool() {
  await pool.end();
}
