-- =========================================================
-- SIRKULA — skema database MySQL 8 / MariaDB 10.6+
-- Dijalankan otomatis oleh `npm run db:migrate`.
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','seller','pembeli') NOT NULL,
  user_type     ENUM('masyarakat','umkm') NOT NULL DEFAULT 'masyarakat',
  phone         VARCHAR(20) NULL,
  whatsapp      VARCHAR(20) NULL,
  address       VARCHAR(255) NULL,
  balance       DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_active (is_active),
  CONSTRAINT chk_users_balance CHECK (balance >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bank_profiles (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  seller_id      INT UNSIGNED NOT NULL,
  name           VARCHAR(120) NOT NULL,
  address        VARCHAR(255) NULL,
  whatsapp       VARCHAR(20) NULL,
  description    TEXT NULL,
  opening_hours  VARCHAR(120) NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bank_profiles_seller (seller_id),
  KEY idx_bank_profiles_active (is_active),
  CONSTRAINT fk_bank_profiles_seller FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key   VARCHAR(60) NOT NULL,
  setting_value TEXT NULL,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS waste_categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(80) NOT NULL,
  icon        VARCHAR(8) NOT NULL DEFAULT '♻',
  description VARCHAR(255) NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_by  INT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_waste_categories_name (name),
  KEY idx_waste_categories_active (is_active),
  CONSTRAINT fk_waste_categories_user FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS waste_types (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id   INT UNSIGNED NOT NULL,
  name          VARCHAR(100) NOT NULL,
  price_per_kg  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  unit          VARCHAR(20) NOT NULL DEFAULT 'kg',
  description   VARCHAR(255) NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_by    INT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_waste_types_name (category_id, name),
  KEY idx_waste_types_category (category_id),
  KEY idx_waste_types_active (is_active),
  CONSTRAINT fk_waste_types_category FOREIGN KEY (category_id) REFERENCES waste_categories (id) ON DELETE RESTRICT,
  CONSTRAINT fk_waste_types_user FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_waste_types_price CHECK (price_per_kg >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS deposits (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code              VARCHAR(24) NULL,
  buyer_id          INT UNSIGNED NOT NULL,
  seller_id         INT UNSIGNED NOT NULL,
  deposit_date      DATE NOT NULL,  status           ENUM('menunggu','diverifikasi','selesai','dibatalkan') NOT NULL DEFAULT 'menunggu',
  payment_method   ENUM('cash','transfer') NOT NULL DEFAULT 'cash',
  total_value      DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  notes             VARCHAR(500) NULL,
  manager_notes     VARCHAR(500) NULL,
  balance_credited  TINYINT(1) NOT NULL DEFAULT 0,
  verified_by       INT UNSIGNED NULL,
  verified_at       DATETIME NULL,
  completed_at      DATETIME NULL,
  cancelled_at      DATETIME NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_deposits_code (code),
  KEY idx_deposits_buyer (buyer_id, status),
  KEY idx_deposits_seller (seller_id, status),
  KEY idx_deposits_date (deposit_date),
  CONSTRAINT fk_deposits_buyer FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_deposits_seller FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_deposits_verifier FOREIGN KEY (verified_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_deposits_total CHECK (total_value >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rincian jenis sampah per setoran. Satu setoran mendukung lebih dari satu jenis.
CREATE TABLE IF NOT EXISTS deposit_details (
  id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  deposit_id             BIGINT UNSIGNED NOT NULL,
  waste_type_id          INT UNSIGNED NOT NULL,
  category_name_snapshot VARCHAR(80) NOT NULL,
  waste_name_snapshot    VARCHAR(100) NOT NULL,
  estimated_weight       DECIMAL(10,2) NOT NULL,
  actual_weight          DECIMAL(10,2) NULL,
  price_per_kg           DECIMAL(12,2) NULL,
  subtotal               DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_deposit_details_type (deposit_id, waste_type_id),
  KEY idx_deposit_details_type (waste_type_id),
  CONSTRAINT fk_deposit_details_deposit FOREIGN KEY (deposit_id) REFERENCES deposits (id) ON DELETE CASCADE,
  CONSTRAINT fk_deposit_details_type FOREIGN KEY (waste_type_id) REFERENCES waste_types (id) ON DELETE RESTRICT,
  CONSTRAINT chk_deposit_details_estimated CHECK (estimated_weight > 0),
  CONSTRAINT chk_deposit_details_actual CHECK (actual_weight IS NULL OR actual_weight >= 0),
  CONSTRAINT chk_deposit_details_price CHECK (price_per_kg IS NULL OR price_per_kg >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS deposit_attachments (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  deposit_id    BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name   VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(120) NOT NULL,
  size_bytes    INT UNSIGNED NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_deposit_attachments_stored (stored_name),
  KEY idx_deposit_attachments_deposit (deposit_id),
  CONSTRAINT fk_deposit_attachments_deposit FOREIGN KEY (deposit_id) REFERENCES deposits (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ledger kredit saldo. UNIQUE (deposit_id) menjamin saldo hanya dikreditkan sekali.
CREATE TABLE IF NOT EXISTS transactions (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  deposit_id  BIGINT UNSIGNED NOT NULL,
  buyer_id    INT UNSIGNED NOT NULL,
  seller_id   INT UNSIGNED NOT NULL,
  type        ENUM('credit') NOT NULL DEFAULT 'credit',
  amount      DECIMAL(14,2) NOT NULL,
  payment_method ENUM('cash','transfer') NOT NULL DEFAULT 'cash',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_transactions_deposit (deposit_id),
  KEY idx_transactions_buyer (buyer_id),
  CONSTRAINT fk_transactions_deposit FOREIGN KEY (deposit_id) REFERENCES deposits (id) ON DELETE RESTRICT,
  CONSTRAINT fk_transactions_buyer FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_transactions_seller FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_transactions_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS balance_histories (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NOT NULL,
  deposit_id     BIGINT UNSIGNED NULL,
  type           ENUM('credit','debit','adjustment') NOT NULL,
  amount         DECIMAL(14,2) NOT NULL,
  balance_before DECIMAL(14,2) NOT NULL,
  balance_after  DECIMAL(14,2) NOT NULL,
  description    VARCHAR(200) NULL,
  created_by     INT UNSIGNED NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_balance_histories_user (user_id, created_at),
  KEY idx_balance_histories_deposit (deposit_id),
  CONSTRAINT fk_balance_histories_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_balance_histories_deposit FOREIGN KEY (deposit_id) REFERENCES deposits (id) ON DELETE SET NULL,
  CONSTRAINT fk_balance_histories_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NULL,
  action      VARCHAR(80) NOT NULL,
  entity      VARCHAR(40) NULL,
  entity_id   VARCHAR(40) NULL,
  description VARCHAR(255) NULL,
  ip_address  VARCHAR(45) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_activity_logs_user (user_id),
  KEY idx_activity_logs_created (created_at),
  CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
