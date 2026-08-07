CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS board_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_board_events_board ON board_events(board_id, revision DESC);
