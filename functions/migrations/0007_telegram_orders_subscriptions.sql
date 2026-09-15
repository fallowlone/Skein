PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS telegram_orders (
  id                          TEXT PRIMARY KEY,
  user_id                     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product                     TEXT NOT NULL,
  amount                      INTEGER NOT NULL,
  currency                    TEXT NOT NULL,
  billing_kind                TEXT NOT NULL,
  subscription_period_seconds INTEGER,
  status                      TEXT NOT NULL,
  telegram_user_id            TEXT,
  checkout_expires_at         INTEGER NOT NULL,
  current_period_end          INTEGER,
  created_at                  INTEGER NOT NULL,
  updated_at                  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telegram_orders_user_created
  ON telegram_orders(user_id, created_at DESC);

ALTER TABLE payments ADD COLUMN order_id TEXT REFERENCES telegram_orders(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN telegram_user_id TEXT;
ALTER TABLE payments ADD COLUMN subscription_expires_at INTEGER;
ALTER TABLE payments ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN is_first_recurring INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN refunded_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_payments_order_created
  ON payments(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS telegram_entitlements (
  order_id    TEXT NOT NULL REFERENCES telegram_orders(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entitlement TEXT NOT NULL,
  active      INTEGER NOT NULL DEFAULT 0,
  expires_at  INTEGER NOT NULL,
  granted_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, entitlement, order_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_entitlements_active
  ON telegram_entitlements(user_id, entitlement, active, expires_at DESC);
