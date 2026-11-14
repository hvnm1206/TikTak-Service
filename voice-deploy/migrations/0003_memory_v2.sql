-- Memory V2 isolated idempotency ledger. Existing V3 memories/documents remain unchanged.
CREATE TABLE IF NOT EXISTS v3_memory_v2_turns (
 user_id TEXT NOT NULL,
 turn_id TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY (user_id,turn_id)
);
CREATE INDEX IF NOT EXISTS idx_v3_memory_v2_turns_created ON v3_memory_v2_turns(created_at);
