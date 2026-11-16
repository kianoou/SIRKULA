import { pool, query } from '../config/db.js';

const PUBLIC_FIELDS = `u.id, u.name, u.email, u.role, u.user_type AS userType, u.phone, u.whatsapp,
  u.address, u.balance, u.is_active AS isActive, u.last_login_at AS lastLoginAt,
  u.created_at AS createdAt, u.updated_at AS updatedAt`;

export async function findByEmailWithPassword(email) {
  const rows = await query(`SELECT ${PUBLIC_FIELDS}, u.password_hash AS passwordHash FROM users u WHERE u.email = ? LIMIT 1`, [email]);
  return rows[0] || null;
}

export async function findById(id) {
  const rows = await query(`SELECT ${PUBLIC_FIELDS} FROM users u WHERE u.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

export async function create({ name, email, passwordHash, role, userType = 'masyarakat', phone = null, whatsapp = null, address = null }) {
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role, user_type, phone, whatsapp, address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, email, passwordHash, role, userType, phone, whatsapp, address],
  );
  return findById(result.insertId);
}

export async function list({ search = '', role = null, isActive = null, limit = 20, offset = 0 }) {
  const filters = [];
  const params = [];
  if (search) {
    filters.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (role) {
    filters.push('u.role = ?');
    params.push(role);
  }
  if (isActive !== null) {
    filters.push('u.is_active = ?');
    params.push(isActive ? 1 : 0);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_FIELDS}, bp.name AS bankName
       FROM users u
       LEFT JOIN bank_profiles bp ON bp.seller_id = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users u ${where}`, params);
  return { rows, total };
}

export async function countByRole() {
  const rows = await query(
    `SELECT role, COUNT(*) AS total,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active
       FROM users GROUP BY role`,
  );
  return rows;
}

export async function update(id, fields) {
  const columns = [];
  const params = [];
  const mapping = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    whatsapp: 'whatsapp',
    address: 'address',
    role: 'role',
    userType: 'user_type',
    isActive: 'is_active',
  };
  for (const [key, column] of Object.entries(mapping)) {
    if (fields[key] !== undefined) {
      columns.push(`${column} = ?`);
      params.push(key === 'isActive' ? (fields[key] ? 1 : 0) : fields[key]);
    }
  }
  if (!columns.length) return findById(id);
  params.push(id);
  await query(`UPDATE users SET ${columns.join(', ')} WHERE id = ?`, params);
  return findById(id);
}

export async function updatePassword(id, passwordHash) {
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
}

export async function touchLogin(id) {
  await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);
}

export async function hasDeposits(id) {
  const rows = await query(
    'SELECT (SELECT COUNT(*) FROM deposits WHERE buyer_id = ?) + (SELECT COUNT(*) FROM deposits WHERE seller_id = ?) AS total',
    [id, id],
  );
  return Number(rows[0].total) > 0;
}

export async function remove(id) {
  await query('DELETE FROM users WHERE id = ?', [id]);
}

/** Nasabah (pembeli) yang pernah bertransaksi dengan seller tertentu. */
export async function listCustomersForSeller(sellerId, { search = '', limit = 20, offset = 0 }) {
  const filters = ['d.seller_id = ?'];
  const params = [sellerId];
  if (search) {
    filters.push('(u.name LIKE ? OR u.email LIKE ? OR u.whatsapp LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.user_type AS userType, u.whatsapp, u.balance,
            u.is_active AS isActive, u.created_at AS createdAt,
            COUNT(d.id) AS depositCount,
            SUM(CASE WHEN d.status = 'selesai' THEN d.total_value ELSE 0 END) AS totalValue,
            MAX(d.deposit_date) AS lastDepositDate
       FROM users u
       JOIN deposits d ON d.buyer_id = u.id
      WHERE ${filters.join(' AND ')}
      GROUP BY u.id
      ORDER BY u.name ASC
      LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(DISTINCT u.id) AS total
       FROM users u JOIN deposits d ON d.buyer_id = u.id
      WHERE ${filters.join(' AND ')}`,
    params,
  );
  return { rows, total };
}

export async function findBankProfile(sellerId) {
  const rows = await query(
    `SELECT id, seller_id AS sellerId, name, address, whatsapp, description,
            opening_hours AS openingHours, is_active AS isActive,
            created_at AS createdAt, updated_at AS updatedAt
       FROM bank_profiles WHERE seller_id = ? LIMIT 1`,
    [sellerId],
  );
  return rows[0] || null;
}

export async function upsertBankProfile(sellerId, data) {
  await query(
    `INSERT INTO bank_profiles (seller_id, name, address, whatsapp, description, opening_hours, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE name = VALUES(name), address = VALUES(address), whatsapp = VALUES(whatsapp),
       description = VALUES(description), opening_hours = VALUES(opening_hours)`,
    [sellerId, data.name, data.address ?? null, data.whatsapp ?? null, data.description ?? null, data.openingHours ?? null],
  );
  return findBankProfile(sellerId);
}

export async function listBalanceHistory(userId, { limit = 20, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT h.id, h.type, h.amount, h.balance_before AS balanceBefore, h.balance_after AS balanceAfter,
            h.description, h.created_at AS createdAt, d.code AS depositCode
       FROM balance_histories h
       LEFT JOIN deposits d ON d.id = h.deposit_id
      WHERE h.user_id = ?
      ORDER BY h.id DESC
      LIMIT ? OFFSET ?`,
    [userId, Number(limit), Number(offset)],
  );
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM balance_histories WHERE user_id = ?', [userId]);
  return { rows: rows.map((row) => ({ ...row, amount: Number(row.amount), balanceBefore: Number(row.balanceBefore), balanceAfter: Number(row.balanceAfter) })), total: Number(total) };
}

export async function listBankProfiles({ onlyActive = true } = {}) {
  const rows = await query(
    `SELECT bp.id, bp.seller_id AS sellerId, bp.name, bp.address, bp.whatsapp, bp.description,
            bp.opening_hours AS openingHours, bp.is_active AS isActive
       FROM bank_profiles bp
       ${onlyActive ? 'WHERE bp.is_active = 1 AND bp.whatsapp IS NOT NULL' : ''}
       ORDER BY bp.name ASC`,
  );
  return rows;
}
