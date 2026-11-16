import * as depositModel from '../models/depositModel.js';
import { isAdmin } from '../middleware/rbac.js';

export async function getReport(user, filters) {
  const scope = isAdmin(user) ? {} : { sellerId: user.id };
  const [summary, byCategory, byPeriod] = await Promise.all([
    depositModel.summary({ ...scope, dateFrom: filters.dateFrom, dateTo: filters.dateTo }),
    depositModel.reportByCategory({ ...scope, dateFrom: filters.dateFrom, dateTo: filters.dateTo }),
    depositModel.reportByPeriod({ ...scope, dateFrom: filters.dateFrom, dateTo: filters.dateTo }),
  ]);

  return {
    range: { dateFrom: filters.dateFrom || null, dateTo: filters.dateTo || null },
    summary,
    byCategory: byCategory.map((row) => ({
      ...row,
      weight: Number(row.weight),
      value: Number(row.value),
      depositCount: Number(row.depositCount),
    })),
    byPeriod: byPeriod.map((row) => ({
      ...row,
      value: Number(row.value),
      depositCount: Number(row.depositCount),
    })),
  };
}
