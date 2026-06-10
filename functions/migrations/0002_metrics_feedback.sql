PRAGMA foreign_keys = ON;

-- Anonymous usage events (lesson_view / lesson_time / practice_result).
-- Raw rows, aggregated at read time by /api/admin/summary.
CREATE TABLE IF NOT EXISTS events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT    NOT NULL,
  ts        INTEGER NOT NULL,
  type      TEXT    NOT NULL,
  lesson    TEXT    NOT NULL,
  track     TEXT,
  lang      TEXT,
  task_id   TEXT,
  task_type TEXT,
  correct   INTEGER,
  seconds   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_events_type_lesson ON events (type, lesson);

-- Reader questions per lesson ("what was unclear here").
CREATE TABLE IF NOT EXISTS feedback (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        INTEGER NOT NULL,
  client_id TEXT    NOT NULL,
  lesson    TEXT    NOT NULL,
  lang      TEXT,
  text      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_ts ON feedback (ts);
