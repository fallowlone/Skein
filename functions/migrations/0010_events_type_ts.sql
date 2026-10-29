PRAGMA foreign_keys = ON;

-- Backs the admin summary's optional `since` bound: the three aggregate
-- queries filter on (type, ts), so the time range narrows the scan instead of
-- only the response page. The pre-existing idx_events_type_lesson stays for
-- the per-lesson grouping.
CREATE INDEX IF NOT EXISTS idx_events_type_ts ON events (type, ts);
