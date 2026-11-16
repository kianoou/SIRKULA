import { z } from 'zod';

const id = z.coerce.number().int().positive();
const password = z.string().min(8, 'Password minimal 8 karakter').max(72, 'Password maksimal 72 karakter');
const email = z.string().trim().email('Format email tidak valid').max(150);
const name = z.string().trim().min(2, 'Nama minimal 2 karakter').max(100);
const whatsapp = z.string().trim().max(20).optional().nullable();
const phone = z.string().trim().max(20).optional().nullable();
const address = z.string().trim().max(255).optional().nullable();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');
const role = z.enum(['admin', 'seller', 'pembeli']);
const userType = z.enum(['masyarakat', 'umkm']);

export const registerSchema = z.object({
  name,
  email,
  password,
  userType: userType.optional(),
  phone,
  whatsapp,
  address,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password wajib diisi'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
  newPassword: password,
});

export const createUserSchema = z.object({
  name,
  email,
  password,
  role,
  userType: userType.optional(),
  phone,
  whatsapp,
  address,
  bankName: z.string().trim().max(120).optional(),
  bankDescription: z.string().trim().max(2000).optional(),
  openingHours: z.string().trim().max(120).optional(),
});

export const updateUserSchema = z.object({
  name: name.optional(),
  email: email.optional(),
  password: password.optional(),
  role: role.optional(),
  userType: userType.optional(),
  phone,
  whatsapp,
  address,
  isActive: z.boolean().optional(),
  bankName: z.string().trim().max(120).optional(),
});

export const activeSchema = z.object({ isActive: z.boolean() });

export const profileSchema = z.object({
  name: name.optional(),
  phone,
  whatsapp,
  address,
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Nama kategori minimal 2 karakter').max(80),
  icon: z.string().trim().max(8).optional(),
  description: z.string().trim().max(255).optional(),
  isActive: z.boolean().optional(),
});

export const typeSchema = z.object({
  categoryId: id,
  name: z.string().trim().min(2, 'Nama jenis sampah minimal 2 karakter').max(100),
  pricePerKg: z.coerce.number().min(0, 'Harga tidak boleh negatif').max(100000000),
  unit: z.string().trim().max(20).optional(),
  description: z.string().trim().max(255).optional(),
  isActive: z.boolean().optional(),
});

export const depositItemSchema = z.object({
  wasteTypeId: id,
  estimatedWeight: z.coerce.number().positive('Estimasi berat harus lebih dari 0 kg').max(100000),
});

export const createDepositSchema = z.object({
  sellerId: id,
  depositDate: date,
  notes: z.string().trim().max(500).optional(),
  items: z
    .union([z.array(depositItemSchema), z.string()])
    .transform((value) => {
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    })
    .pipe(z.array(depositItemSchema).min(1, 'Pilih minimal satu jenis sampah').max(5, 'Maksimal 5 jenis sampah per setoran')),
});

export const verifySchema = z.object({
  items: z
    .array(
      z.object({
        detailId: id,
        actualWeight: z.coerce.number().min(0, 'Berat aktual tidak boleh negatif').max(100000),
        pricePerKg: z.coerce.number().min(0, 'Harga tidak boleh negatif').max(100000000),
      }),
    )
    .min(1, 'Berat aktual wajib diisi'),
  managerNotes: z.string().trim().max(500).optional(),
});

export const cancelSchema = z.object({ reason: z.string().trim().max(500).optional() });

export const settingsSchema = z.object({
  appName: z.string().trim().max(60).optional(),
  appTagline: z.string().trim().max(100).optional(),
  whatsappPengelola: z.string().trim().max(20).optional(),
  depositInstructions: z.string().trim().max(2000).optional(),
});

export const bankProfileSchema = z.object({
  name: z.string().trim().min(2, 'Nama bank sampah minimal 2 karakter').max(120),
  address: address,
  whatsapp,
  description: z.string().trim().max(2000).optional(),
  openingHours: z.string().trim().max(120).optional(),
  sellerId: id.optional(),
});

export const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['semua', 'menunggu', 'diverifikasi', 'selesai', 'dibatalkan']).optional(),
  role: role.optional(),
  isActive: z.enum(['true', 'false']).optional(),
  sellerId: id.optional(),
  categoryId: id.optional(),
  dateFrom: date.optional(),
  dateTo: date.optional(),
  action: z.string().trim().max(80).optional(),
  userId: id.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const idParamSchema = z.object({ id });
