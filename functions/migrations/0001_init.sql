PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id         INTEGER NOT NULL UNIQUE,
  login             TEXT    NOT NULL,
  nickname          TEXT    NOT NULL,
  avatar_url        TEXT,
  terms_version     TEXT,
  terms_accepted_at INTEGER,
  created_at        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS progress (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT    NOT NULL,
  updated_at INTEGER NOT NULL
);
