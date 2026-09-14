PRAGMA foreign_keys = ON;

ALTER TABLE telegram_orders ADD COLUMN pre_checkout_query_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_orders_pre_checkout_query
  ON telegram_orders(pre_checkout_query_id)
  WHERE pre_checkout_query_id IS NOT NULL;
