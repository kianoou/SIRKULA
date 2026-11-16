import { pool, query } from '../config/db.js';

/* ------------------------------- Kategori ------------------------------- */

export async function listCategories({ search = '', onlyActive = false } = {}) {
  const filters = [];
  const params = [];
  if (search) {
    filters.push('(c.name LIKE ? OR c.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (onlyActive) filters.push('c.is_active = 1');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.icon, c.description, c.is_active AS isActive,
            c.created_at AS createdAt, c.updated_at AS updatedAt,
            COUNT(t.id) AS typeCount,
            SUM(CASE WHEN t.is_active = 1 THEN 1 ELSE 0 END) AS activeTypeCount
       FROM waste_categories c
       LEFT JOIN waste_types t ON t.category_id = c.id
       ${where}
       GROUP BY c.id
       ORDER BY c.name ASC`,
    params,
  );
  return rows;
}

export async function findCategory(id) {
  const rows = await query(
    `SELECT id, name, icon, description, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
       FROM waste_categories WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

export async function findCategoryByName(name, excludeId = null) {
  const rows = await query(
    'SELECT id, name FROM waste_categories WHERE LOWER(name) = LOWER(?) AND id <> ? LIMIT 1',
    [name, excludeId ?? 0],
  );
  return rows[0] || null;
}

export async function createCategory({ name, icon, description, createdBy }) {
  const result = await query(
    'INSERT INTO waste_categories (name, icon, description, created_by) VALUES (?, ?, ?, ?)',
    [name, icon || '♻', description || null, createdBy],
  );
  return findCategory(result.insertId);
}

export async function updateCategory(id, { name, icon, description, isActive }) {
  await query(
    'UPDATE waste_categories SET name = ?, icon = ?, description = ?, is_active = ? WHERE id = ?',
    [name, icon || '♻', description || null, isActive ? 1 : 0, id],
  );
  return findCategory(id);
}

export async function categoryUsage(id) {
  const rows = await query(
    `SELECT (SELECT COUNT(*) FROM waste_types WHERE category_id = ?) AS typeCount,
            (SELECT COUNT(*) FROM deposit_details WHERE waste_type_id IN (SELECT id FROM waste_types WHERE category_id = ?)) AS depositCount`,
    [id, id],
  );
  return { typeCount: Number(rows[0].typeCount), depositCount: Number(rows[0].depositCount) };
}

export async function deleteCategory(id) {
  await query('DELETE FROM waste_categories WHERE id = ?', [id]);
}

/* ------------------------------ Jenis sampah ---------------------------- */

const TYPE_SELECT = `t.id, t.category_id AS categoryId, c.name AS categoryName, c.icon AS categoryIcon,
  t.name, t.price_per_kg AS pricePerKg, t.unit, t.description, t.is_active AS isActive,
  t.created_at AS createdAt, t.updated_at AS updatedAt`;

export async function listTypes({ categoryId = null, search = '', onlyActive = false } = {}) {
  const filters = [];
  const params = [];
  if (categoryId) {
    filters.push('t.category_id = ?');
    params.push(categoryId);
  }
  if (search) {
    filters.push('(t.name LIKE ? OR c.name LIKE ? OR t.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (onlyActive) {
    filters.push('t.is_active = 1');
    filters.push('c.is_active = 1');
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT ${TYPE_SELECT}
       FROM waste_types t
       JOIN waste_categories c ON c.id = t.category_id
       ${where}
       ORDER BY c.name ASC, t.name ASC`,
    params,
  );
  return rows;
}

export async function findType(id) {
  const rows = await query(
    `SELECT ${TYPE_SELECT}, c.is_active AS categoryActive
       FROM waste_types t JOIN waste_categories c ON c.id = t.category_id
      WHERE t.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

export async function findTypeByName(categoryId, name, excludeId = null) {
  const rows = await query(
    'SELECT id FROM waste_types WHERE category_id = ? AND LOWER(name) = LOWER(?) AND id <> ? LIMIT 1',
    [categoryId, name, excludeId ?? 0],
  );
  return rows[0] || null;
}

export async function createType({ categoryId, name, pricePerKg, unit = 'kg', description, createdBy }) {
  const result = await query(
    `INSERT INTO waste_types (category_id, name, price_per_kg, unit, description, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [categoryId, name, pricePerKg, unit, description || null, createdBy],
  );
  return findType(result.insertId);
}

export async function updateType(id, { categoryId, name, pricePerKg, unit, description, isActive }) {
  await query(
    `UPDATE waste_types SET category_id = ?, name = ?, price_per_kg = ?, unit = ?, description = ?, is_active = ?
      WHERE id = ?`,
    [categoryId, name, pricePerKg, unit || 'kg', description || null, isActive ? 1 : 0, id],
  );
  return findType(id);
}

export async function typeUsage(id) {
  const rows = await query('SELECT COUNT(*) AS total FROM deposit_details WHERE waste_type_id = ?', [id]);
  return Number(rows[0].total);
}

export async function deleteType(id) {
  await query('DELETE FROM waste_types WHERE id = ?', [id]);
}
