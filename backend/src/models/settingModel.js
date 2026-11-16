import { query } from '../config/db.js';

export async function getAll() {
  const rows = await query('SELECT setting_key AS `key`, setting_value AS `value`, updated_at AS updatedAt FROM app_settings ORDER BY setting_key');
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function set(key, value) {
  await query(
    `INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [key, value ?? null],
  );
}

export async function setMany(entries) {
  for (const [key, value] of Object.entries(entries)) {
    await set(key, value);
  }
}
