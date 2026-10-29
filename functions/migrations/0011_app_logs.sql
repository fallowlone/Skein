PRAGMA foreign_keys = ON;

-- Sink for the structured request logger (functions/lib/logger.ts via
-- lib/logstore.ts flushLogs). Rows are sampled per request (errors always,
-- auth/admin/payments/telegram/coach info always, everything else sampled),
-- secrets redacted, ctx capped at 4000 bytes. Retention is 30 days, enforced
-- by flushLogs' opportunistic purge (~1% of non-empty flushes, 200-row
-- batches) on the ts predicate below — hence the index. D1 supports
-- LIMIT on DELETE, so the purge needs no subselect workaround.
CREATE TABLE IF NOT EXISTS app_logs (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       INTEGER NOT NULL,
  level    TEXT    NOT NULL,
  route    TEXT    NOT NULL,
  rid      TEXT    NOT NULL,
  flow     TEXT,
  user_id  INTEGER,
  tag      TEXT    NOT NULL,
  msg      TEXT    NOT NULL,
  ctx_json TEXT    NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_app_logs_ts ON app_logs (ts);
