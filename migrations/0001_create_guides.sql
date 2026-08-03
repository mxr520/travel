CREATE TABLE IF NOT EXISTS guides (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  saved_at TEXT,
  updated INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS guides_updated_idx ON guides(updated DESC);
