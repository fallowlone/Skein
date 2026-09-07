PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS entitlements (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entitlement TEXT    NOT NULL,
  active      INTEGER NOT NULL DEFAULT 0,
  source      TEXT    NOT NULL,
  source_ref  TEXT,
  granted_at  INTEGER,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, entitlement)
);

CREATE TABLE IF NOT EXISTS github_sponsorships (
  sponsorship_id     TEXT PRIMARY KEY,
  github_sponsor_id  INTEGER,
  user_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  tier_id            TEXT NOT NULL,
  tier_name          TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL,
  is_one_time        INTEGER NOT NULL,
  privacy_level      TEXT NOT NULL,
  status             TEXT NOT NULL,
  updated_at         INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_github_sponsorships_sponsor
  ON github_sponsorships(github_sponsor_id);

CREATE TABLE IF NOT EXISTS billing_deliveries (
  delivery_id TEXT PRIMARY KEY,
  payload_hash TEXT NOT NULL UNIQUE,
  event       TEXT NOT NULL,
  action      TEXT NOT NULL,
  received_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_usage (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT    NOT NULL,
  period  TEXT    NOT NULL,
  used    INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, feature, period)
);
