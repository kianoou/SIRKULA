import { pool, query } from '../config/db.js';

const HEADER_SELECT = `
  d.id, d.code, d.buyer_id AS buyerId, u.name AS buyerName, u.email AS buyerEmail, u.whatsapp AS buyerWhatsapp,
  d.seller_id AS sellerId, s.name AS sellerName, bp.name AS bankName, bp.whatsapp AS bankWhatsapp,
  d.deposit_date AS depositDate, d.status, d.total_value AS totalValue, d.notes,
  d.manager_notes AS managerNotes, d.balance_credited AS balanceCredited, d.payment_method AS paymentMethod,
  d.verified_at AS verifiedAt, d.completed_at AS completedAt, d.cancelled_at AS cancelledAt,
  d.created_at AS createdAt, d.updated_at AS updatedAt,
  (SELECT COALESCE(SUM(dd.estimated_weight), 0) FROM deposit_details dd WHERE dd.deposit_id = d.id) AS estimatedWeight,
  (SELECT COALESCE(SUM(dd.actual_weight), 0) FROM deposit_details dd WHERE dd.deposit_id = d.id) AS actualWeight,
  (SELECT GROUP_CONCAT(dd.waste_name_snapshot SEPARATOR ', ') FROM deposit_details dd WHERE dd.deposit_id = d.id) AS wasteNames,
  (SELECT COUNT(*) FROM deposit_details dd WHERE dd.deposit_id = d.id) AS itemCount,
  (SELECT COUNT(*) FROM deposit_attachments da WHERE da.deposit_id = d.id) AS attachmentCount`;

const FROM_CLAUSE = `
  FROM deposits d
  JOIN users u ON u.id = d.buyer_id
  JOIN users s ON s.id = d.seller_id
  LEFT JOIN bank_profiles bp ON bp.seller_id = d.seller_id`;

export function normalizeDeposit(row) {
  if (!row) return row;
  return {
    ...row,
    totalValue: Number(row.totalValue),
    estimatedWeight: Number(row.estimatedWeight),
    actualWeight: Number(row.actualWeight),
    itemCount: Number(row.itemCount),
    attachmentCount: Number(row.attachmentCount),
    balanceCredited: Boolean(row.balanceCredited),
    paymentMethod: row.paymentMethod || 'cash',
  };
}

export async function createHeader(conn, { buyerId, sellerId, depositDate, notes }) {
  const [result] = await conn.execute(
    `INSERT INTO deposits (buyer_id, seller_id, deposit_date, notes, status)
     VALUES (?, ?, ?, ?, 'menunggu')`,
    [buyerId, sellerId, depositDate, notes || null],
  );
  await conn.execute('UPDATE deposits SET code = CONCAT("S-", 1000 + id) WHERE id = ?', [result.insertId]);
  return result.insertId;
}

export async function insertDetail(conn, depositId, detail) {
  await conn.execute(
    `INSERT INTO deposit_details
      (deposit_id, waste_type_id, category_name_snapshot, waste_name_snapshot,
       estimated_weight, actual_weight, price_per_kg, subtotal)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      depositId,
      detail.wasteTypeId,
      detail.categoryName,
      detail.wasteName,
      detail.estimatedWeight,
      detail.actualWeight ?? null,
      detail.pricePerKg ?? null,
      detail.subtotal ?? 0,
    ],
  );
}

export async function insertAttachments(conn, depositId, files) {
  for (const file of files) {
    await conn.execute(
      `INSERT INTO deposit_attachments (deposit_id, original_name, stored_name, mime_type, size_bytes)
       VALUES (?, ?, ?, ?, ?)`,
      [depositId, file.originalName, file.storedName, file.mimeType, file.sizeBytes],
    );
  }
}

export async function findById(id) {
  const rows = await query(`SELECT ${HEADER_SELECT} ${FROM_CLAUSE} WHERE d.id = ? LIMIT 1`, [id]);
  return normalizeDeposit(rows[0] || null);
}

export async function findDetails(depositId) {
  const rows = await query(
    `SELECT dd.id, dd.waste_type_id AS wasteTypeId, dd.category_name_snapshot AS categoryName,
            dd.waste_name_snapshot AS wasteName, dd.estimated_weight AS estimatedWeight,
            dd.actual_weight AS actualWeight, dd.price_per_kg AS pricePerKg, dd.subtotal
       FROM deposit_details dd
      WHERE dd.deposit_id = ?
      ORDER BY dd.id ASC`,
    [depositId],
  );
  return rows.map((row) => ({
    ...row,
    estimatedWeight: Number(row.estimatedWeight),
    actualWeight: row.actualWeight === null ? null : Number(row.actualWeight),
    pricePerKg: row.pricePerKg === null ? null : Number(row.pricePerKg),
    subtotal: Number(row.subtotal),
  }));
}

export async function findAttachments(depositId) {
  const rows = await query(
    `SELECT id, original_name AS originalName, stored_name AS storedName, mime_type AS mimeType,
            size_bytes AS sizeBytes, created_at AS createdAt
       FROM deposit_attachments WHERE deposit_id = ? ORDER BY id ASC`,
    [depositId],
  );
  return rows.map(({ storedName, ...rest }) => ({ ...rest, sizeBytes: Number(rest.sizeBytes) }));
}

export async function findAttachmentById(id) {
  const rows = await query(
    `SELECT a.id, a.deposit_id AS depositId, a.original_name AS originalName, a.stored_name AS storedName,
            a.mime_type AS mimeType, a.size_bytes AS sizeBytes
       FROM deposit_attachments a WHERE a.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

export async function list({ buyerId = null, sellerId = null, status = null, search = '', dateFrom = null, dateTo = null, categoryId = null, limit = 20, offset = 0 }) {
  const filters = [];
  const params = [];
  if (buyerId) {
    filters.push('d.buyer_id = ?');
    params.push(buyerId);
  }
  if (sellerId) {
    filters.push('d.seller_id = ?');
    params.push(sellerId);
  }
  if (status && status !== 'semua') {
    filters.push('d.status = ?');
    params.push(status);
  }
  if (dateFrom) {
    filters.push('d.deposit_date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    filters.push('d.deposit_date <= ?');
    params.push(dateTo);
  }
  if (categoryId) {
    filters.push(
      'EXISTS (SELECT 1 FROM deposit_details dd JOIN waste_types wt ON wt.id = dd.waste_type_id WHERE dd.deposit_id = d.id AND wt.category_id = ?)',
    );
    params.push(categoryId);
  }
  if (search) {
    filters.push('(d.code LIKE ? OR u.name LIKE ? OR d.notes LIKE ? OR EXISTS (SELECT 1 FROM deposit_details dd WHERE dd.deposit_id = d.id AND dd.waste_name_snapshot LIKE ?))');
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT ${HEADER_SELECT} ${FROM_CLAUSE} ${where} ORDER BY d.created_at DESC, d.id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total ${FROM_CLAUSE} ${where}`,
    params,
  );
  return { rows: rows.map(normalizeDeposit), total: Number(total) };
}

export async function lockById(conn, id) {
  const [rows] = await conn.execute(
    `SELECT id, code, buyer_id AS buyerId, seller_id AS sellerId, status, payment_method AS paymentMethod, total_value AS totalValue,
            balance_credited AS balanceCredited
       FROM deposits WHERE id = ? FOR UPDATE`,
    [id],
  );
  return rows[0] || null;
}

export async function updateStatus(conn, id, status, extra = {}) {
  const columns = ['status = ?'];
  const params = [status];
  if (status === 'diverifikasi') {
    columns.push('verified_by = ?', 'verified_at = NOW()');
    params.push(extra.verifiedBy);
  }
  if (status === 'selesai') {
    columns.push('completed_at = NOW()');
    if (extra.paymentMethod) {
      columns.push('payment_method = ?');
      params.push(extra.paymentMethod);
    }
  }
  if (status === 'dibatalkan') columns.push('cancelled_at = NOW()');
  if (extra.totalValue !== undefined) {
    columns.push('total_value = ?');
    params.push(extra.totalValue);
  }
  if (extra.notes !== undefined) {
    columns.push('manager_notes = ?');
    params.push(extra.notes);
  }
  params.push(id);
  await conn.execute(`UPDATE deposits SET ${columns.join(', ')} WHERE id = ?`, params);
}

export async function updateDetail(conn, detailId, { actualWeight, pricePerKg, subtotal }) {
  await conn.execute(
    'UPDATE deposit_details SET actual_weight = ?, price_per_kg = ?, subtotal = ? WHERE id = ?',
    [actualWeight, pricePerKg, subtotal, detailId],
  );
}

export async function markCredited(conn, id) {
  await conn.execute('UPDATE deposits SET balance_credited = 1 WHERE id = ?', [id]);
}

export async function lockBuyerBalance(conn, buyerId) {
  const [rows] = await conn.execute('SELECT id, name, balance FROM users WHERE id = ? FOR UPDATE', [buyerId]);
  return rows[0] || null;
}

export async function creditBuyer({ conn, deposit, before, after }) {
  await conn.execute('UPDATE users SET balance = ? WHERE id = ?', [after, deposit.buyerId]);    await conn.execute(
      `INSERT INTO transactions (deposit_id, buyer_id, seller_id, amount, payment_method) VALUES (?, ?, ?, ?, ?)`,
      [deposit.id, deposit.buyerId, deposit.sellerId, deposit.totalValue, deposit.paymentMethod || 'cash'],
    );
  await conn.execute(
    `INSERT INTO balance_histories
      (user_id, deposit_id, type, amount, balance_before, balance_after, description, created_by)
     VALUES (?, ?, 'credit', ?, ?, ?, ?, ?)`,
    [
      deposit.buyerId,
      deposit.id,
      deposit.totalValue,
      before,
      after,
      `Setoran ${deposit.code} selesai`,
      deposit.verifiedBy || deposit.sellerId,
    ],
  );
}

/* ------------------------------ Statistik ------------------------------ */

export async function summary({ sellerId = null, buyerId = null, dateFrom = null, dateTo = null } = {}) {
  const filters = [];
  const params = [];
  if (sellerId) {
    filters.push('d.seller_id = ?');
    params.push(sellerId);
  }
  if (buyerId) {
    filters.push('d.buyer_id = ?');
    params.push(buyerId);
  }
  if (dateFrom) {
    filters.push('d.deposit_date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    filters.push('d.deposit_date <= ?');
    params.push(dateTo);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = await query(
    `SELECT
       COUNT(*) AS totalDeposits,
       SUM(CASE WHEN d.status = 'menunggu' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN d.status = 'diverifikasi' THEN 1 ELSE 0 END) AS verified,
       SUM(CASE WHEN d.status = 'selesai' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN d.status = 'dibatalkan' THEN 1 ELSE 0 END) AS cancelled,
       COALESCE(SUM(CASE WHEN d.status = 'selesai' THEN d.total_value ELSE 0 END), 0) AS totalValue,
       COALESCE((SELECT SUM(dd.actual_weight) FROM deposit_details dd
                  JOIN deposits d2 ON d2.id = dd.deposit_id
                  WHERE d2.status = 'selesai'
                  ${sellerId ? 'AND d2.seller_id = ?' : ''}
                  ${buyerId ? 'AND d2.buyer_id = ?' : ''}
                  ${dateFrom ? 'AND d2.deposit_date >= ?' : ''}
                  ${dateTo ? 'AND d2.deposit_date <= ?' : ''}), 0) AS totalWeight
     FROM deposits d ${where}`,
    [...params, ...params],
  );
  const row = rows[0];
  return {
    totalDeposits: Number(row.totalDeposits) || 0,
    pending: Number(row.pending) || 0,
    verified: Number(row.verified) || 0,
    completed: Number(row.completed) || 0,
    cancelled: Number(row.cancelled) || 0,
    totalValue: Number(row.totalValue) || 0,
    totalWeight: Number(row.totalWeight) || 0,
  };
}

export async function composition({ sellerId = null, buyerId = null, dateFrom = null, dateTo = null } = {}) {
  const filters = ["d.status = 'selesai'"];
  const params = [];
  if (sellerId) {
    filters.push('d.seller_id = ?');
    params.push(sellerId);
  }
  if (buyerId) {
    filters.push('d.buyer_id = ?');
    params.push(buyerId);
  }
  if (dateFrom) {
    filters.push('d.deposit_date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    filters.push('d.deposit_date <= ?');
    params.push(dateTo);
  }
  const rows = await query(
    `SELECT dd.category_name_snapshot AS categoryName, c.icon,
            COALESCE(SUM(dd.actual_weight), 0) AS weight,
            COALESCE(SUM(dd.subtotal), 0) AS value
       FROM deposit_details dd
       JOIN deposits d ON d.id = dd.deposit_id
       LEFT JOIN waste_types wt ON wt.id = dd.waste_type_id
       LEFT JOIN waste_categories c ON c.id = wt.category_id
      WHERE ${filters.join(' AND ')}
      GROUP BY dd.category_name_snapshot, c.icon
      ORDER BY weight DESC`,
    params,
  );
  return rows.map((row) => ({ ...row, weight: Number(row.weight), value: Number(row.value) }));
}

export async function recent({ sellerId = null, buyerId = null, limit = 5 }) {
  const filters = [];
  const params = [];
  if (sellerId) {
    filters.push('d.seller_id = ?');
    params.push(sellerId);
  }
  if (buyerId) {
    filters.push('d.buyer_id = ?');
    params.push(buyerId);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT ${HEADER_SELECT} ${FROM_CLAUSE} ${where} ORDER BY d.created_at DESC, d.id DESC LIMIT ?`,
    [...params, Number(limit)],
  );
  return rows.map(normalizeDeposit);
}

export async function reportByCategory({ sellerId = null, dateFrom, dateTo }) {
  const filters = ["d.status = 'selesai'"];
  const params = [];
  if (sellerId) {
    filters.push('d.seller_id = ?');
    params.push(sellerId);
  }
  if (dateFrom) {
    filters.push('d.deposit_date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    filters.push('d.deposit_date <= ?');
    params.push(dateTo);
  }
  return query(
    `SELECT dd.category_name_snapshot AS categoryName, dd.waste_name_snapshot AS wasteName,
            COUNT(DISTINCT d.id) AS depositCount,
            COALESCE(SUM(dd.actual_weight), 0) AS weight,
            COALESCE(SUM(dd.subtotal), 0) AS value
       FROM deposit_details dd
       JOIN deposits d ON d.id = dd.deposit_id
      WHERE ${filters.join(' AND ')}
      GROUP BY dd.category_name_snapshot, dd.waste_name_snapshot
      ORDER BY weight DESC`,
    params,
  );
}

export async function reportByPeriod({ sellerId = null, dateFrom, dateTo }) {
  const filters = ["d.status = 'selesai'"];
  const params = [];
  if (sellerId) {
    filters.push('d.seller_id = ?');
    params.push(sellerId);
  }
  if (dateFrom) {
    filters.push('d.deposit_date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    filters.push('d.deposit_date <= ?');
    params.push(dateTo);
  }
  return query(
    `SELECT DATE_FORMAT(d.deposit_date, '%Y-%m') AS period,
            COUNT(DISTINCT d.id) AS depositCount,
            COALESCE(SUM(d.total_value), 0) AS value
       FROM deposits d
      WHERE ${filters.join(' AND ')}
      GROUP BY period ORDER BY period ASC`,
    params,
  );
}
