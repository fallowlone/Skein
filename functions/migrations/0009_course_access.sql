PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS lesson_exercise_passes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_key TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  passed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, lesson_key, exercise_id)
);

CREATE TABLE IF NOT EXISTS lesson_completions (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_key TEXT NOT NULL,
  completed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, lesson_key)
);

CREATE TABLE IF NOT EXISTS course_access_grants (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_ref TEXT NOT NULL,
  expires_at INTEGER,
  revoked_at INTEGER,
  PRIMARY KEY (provider, provider_ref, track)
);

CREATE INDEX IF NOT EXISTS idx_course_access_user_track
  ON course_access_grants(user_id, track, expires_at);

CREATE TABLE IF NOT EXISTS course_purchase_intents (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  track TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);
