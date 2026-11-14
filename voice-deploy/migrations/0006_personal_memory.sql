-- Additive pilot storage. Each revision retains the user's source and learning date.
CREATE TABLE IF NOT EXISTS v3_personal_memory (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 slot TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category IN ('identity','context','ask','disc','collaboration')),
 aspect TEXT NOT NULL,
 subject TEXT NOT NULL,
 domain TEXT NOT NULL,
 body TEXT NOT NULL,
 evidence TEXT NOT NULL,
 search_text TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('stated','observed','inferred')),
 state TEXT NOT NULL CHECK(state IN ('confirmed','candidate','discarded')),
 turn_id TEXT NOT NULL,
 learned_at INTEGER NOT NULL,
 effective_date TEXT,
 previous_id TEXT,
 support_id TEXT,
 UNIQUE (user_id, slot, turn_id)
);
CREATE INDEX IF NOT EXISTS idx_v3_personal_memory_slot ON v3_personal_memory(user_id,slot,learned_at DESC,id);
CREATE INDEX IF NOT EXISTS idx_v3_personal_memory_recent ON v3_personal_memory(user_id,learned_at DESC);
CREATE VIEW IF NOT EXISTS v3_personal_memory_current AS
 SELECT m.* FROM v3_personal_memory m WHERE NOT EXISTS
 (SELECT 1 FROM v3_personal_memory newer WHERE newer.user_id=m.user_id AND newer.slot=m.slot
  AND (newer.learned_at>m.learned_at OR (newer.learned_at=m.learned_at AND newer.id>m.id)));
