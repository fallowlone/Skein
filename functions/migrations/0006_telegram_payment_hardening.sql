PRAGMA foreign_keys = ON;

ALTER TABLE payments ADD COLUMN processed_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_payments_user_created
  ON payments(user_id, created_at DESC);
