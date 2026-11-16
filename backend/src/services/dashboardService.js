import * as depositModel from '../models/depositModel.js';
import * as userModel from '../models/userModel.js';
import * as activity from '../models/activityModel.js';
import * as settingService from './settingService.js';
import { isAdmin, isSeller } from '../middleware/rbac.js';

async function adminDashboard() {
  const [roleCounts, summary, composition, recent, logs, settings, banks] = await Promise.all([
    userModel.countByRole(),
    depositModel.summary({}),
    depositModel.composition({}),
    depositModel.recent({ limit: 6 }),
    activity.list({ limit: 8 }),
    settingService.getSettings(),
    userModel.listBankProfiles({ onlyActive: false }),
  ]);

  const countRole = (role) => {
    const row = roleCounts.find((item) => item.role === role);
    return { total: Number(row?.total || 0), active: Number(row?.active || 0) };
  };

  return {
    role: 'admin',
    stats: {
      totalUsers: roleCounts.reduce((sum, row) => sum + Number(row.total), 0),
      totalSellers: countRole('seller').total,
      totalBuyers: countRole('pembeli').total,
      totalAdmins: countRole('admin').total,
      activeUsers: roleCounts.reduce((sum, row) => sum + Number(row.active), 0),
      totalDeposits: summary.totalDeposits,
      totalWeight: summary.totalWeight,
      totalValue: summary.totalValue,
      pending: summary.pending,
      verified: summary.verified,
      completed: summary.completed,
      cancelled: summary.cancelled,
      bankCount: banks.length,
    },
    composition,
    recentDeposits: recent,
    recentActivity: logs.rows,
    settings,
  };
}

async function sellerDashboard(user) {
  const [summary, composition, recent, customers, logs, bankProfile] = await Promise.all([
    depositModel.summary({ sellerId: user.id }),
    depositModel.composition({ sellerId: user.id }),
    depositModel.recent({ sellerId: user.id, limit: 6 }),
    userModel.listCustomersForSeller(user.id, { limit: 1000, offset: 0 }),
    activity.list({ limit: 6, userId: user.id }),
    userModel.findBankProfile(user.id),
  ]);

  const totalBalance = customers.rows.reduce((sum, customer) => sum + Number(customer.balance), 0);

  return {
    role: 'seller',
    stats: {
      totalCustomers: customers.total,
      totalDeposits: summary.totalDeposits,
      totalWeight: summary.totalWeight,
      totalValue: summary.totalValue,
      pending: summary.pending,
      verified: summary.verified,
      completed: summary.completed,
      cancelled: summary.cancelled,
      totalBalance,
    },
    composition,
    recentDeposits: recent,
    recentActivity: logs.rows,
    bankProfile,
  };
}

async function buyerDashboard(user) {
  const [summary, composition, recent, history] = await Promise.all([
    depositModel.summary({ buyerId: user.id }),
    depositModel.composition({ buyerId: user.id }),
    depositModel.recent({ buyerId: user.id, limit: 6 }),
    userModel.listBalanceHistory(user.id, { limit: 5, offset: 0 }),
  ]);

  return {
    role: 'pembeli',
    stats: {
      balance: Number(user.balance),
      totalDeposits: summary.totalDeposits,
      totalWeight: summary.totalWeight,
      totalValue: summary.totalValue,
      pending: summary.pending,
      verified: summary.verified,
      completed: summary.completed,
      cancelled: summary.cancelled,
    },
    composition,
    recentDeposits: recent,
    recentBalance: history.rows,
  };
}

export async function getDashboard(user) {
  if (isAdmin(user)) return adminDashboard();
  if (isSeller(user)) return sellerDashboard(user);
  return buyerDashboard(user);
}
