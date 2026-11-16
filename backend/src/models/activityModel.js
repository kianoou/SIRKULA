import { pool, query } from '../config/db.js';

export async function log({ userId = null, action, entity = null, entityId = null, description = null, ip = null }) {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, action, entity, entity_id, description, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, entity, entityId === null ? null : String(entityId), description, ip],
    );
  } catch (error) {
    // Log aktivitas tidak boleh menggagalkan permintaan utama.
    console.error('[activity-log] gagal menyimpan log:', error.message);
  }
}

export async function list({ limit = 50, offset = 0, action = null, userId = null }) {
  const filters = [];
  const params = [];
  if (action) {
    filters.push('a.action LIKE ?');
    params.push(`%${action}%`);
  }
  if (userId) {
    filters.push('a.user_id = ?');
    params.push(userId);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT a.id, a.action, a.entity, a.entity_id, a.description, a.ip_address, a.created_at,
            u.name AS user_name, u.role AS user_role
       FROM activity_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.id DESC
       LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM activity_logs a ${where}`,
    params,
  );
  return { rows, total };
}
