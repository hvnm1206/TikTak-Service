CREATE TABLE IF NOT EXISTS v3_personal_memory_status (
 user_id TEXT PRIMARY KEY,
 turn_id TEXT NOT NULL,
 learned_at INTEGER NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('pending','saved','no-change','ignored','analysis-failed','skipped-action')),
 saved_count INTEGER NOT NULL DEFAULT 0,
 reason TEXT
);
