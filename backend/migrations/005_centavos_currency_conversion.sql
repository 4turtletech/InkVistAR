-- Migration 005: Financial Centavos Standardization & POS Ledger

-- 1. Add amount_centavos column to payments table
ALTER TABLE payments 
  ADD COLUMN IF NOT EXISTS amount_centavos INT DEFAULT 0;

UPDATE payments 
  SET amount_centavos = ROUND(amount * 100) 
  WHERE amount_centavos = 0 AND amount IS NOT NULL;

-- 2. Add price_centavos to appointments table
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS price_centavos INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_centavos INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manual_paid_centavos INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_centavos INT DEFAULT 0;

UPDATE appointments 
  SET price_centavos = ROUND(price * 100) 
  WHERE price_centavos = 0 AND price IS NOT NULL;

UPDATE appointments 
  SET deposit_centavos = ROUND(deposit_amount * 100) 
  WHERE deposit_centavos = 0 AND deposit_amount IS NOT NULL;

UPDATE appointments 
  SET manual_paid_centavos = ROUND(manual_paid_amount * 100) 
  WHERE manual_paid_centavos = 0 AND manual_paid_amount IS NOT NULL;

-- 3. Inventory cost & retail price in centavos
ALTER TABLE inventory 
  ADD COLUMN IF NOT EXISTS cost_centavos INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retail_price_centavos INT DEFAULT 0;

UPDATE inventory 
  SET cost_centavos = ROUND(cost * 100) 
  WHERE cost_centavos = 0 AND cost IS NOT NULL;

UPDATE inventory 
  SET retail_price_centavos = ROUND(retail_price * 100) 
  WHERE retail_price_centavos = 0 AND retail_price IS NOT NULL;

-- 4. POS Drawer Sessions & Settlement Logs
CREATE TABLE IF NOT EXISTS pos_drawer_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  opened_by_user_id INT NOT NULL,
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  starting_float_centavos INT NOT NULL DEFAULT 0,
  closed_by_user_id INT NULL,
  closed_at DATETIME NULL,
  expected_cash_centavos INT DEFAULT 0,
  actual_cash_centavos INT DEFAULT 0,
  variance_centavos INT DEFAULT 0,
  closing_notes TEXT NULL,
  status VARCHAR(50) DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS daily_settlements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  settlement_date DATE NOT NULL UNIQUE,
  total_digital_centavos INT DEFAULT 0,
  total_cash_centavos INT DEFAULT 0,
  total_discounts_centavos INT DEFAULT 0,
  total_refunds_centavos INT DEFAULT 0,
  reconciled_by_user_id INT NOT NULL,
  reconciled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL
);

CREATE TABLE IF NOT EXISTS unified_financial_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NULL,
  customer_id INT NOT NULL,
  transaction_type VARCHAR(100) NOT NULL, -- 'deposit', 'balance_payment', 'full_payment', 'manual_cash', 'discount', 'refund', 'chargeback', 'forfeiture', 'reversal'
  payment_method VARCHAR(50) NOT NULL, -- 'paymongo', 'cash', 'card_pos', 'bank_transfer', 'gcash'
  amount_centavos INT NOT NULL,
  reference_code VARCHAR(255) NULL,
  notes TEXT NULL,
  processed_by_user_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
