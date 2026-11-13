-- NMH Voice V3 — D1 per-user, explicit data ownership
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS v3_users (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS v3_profiles (
 user_id TEXT PRIMARY KEY REFERENCES v3_users(id) ON DELETE CASCADE,
 prompt TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS v3_memories (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES v3_users(id) ON DELETE CASCADE,
 body TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_v3_memories_owner_created ON v3_memories(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS v3_documents (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES v3_users(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 mime TEXT NOT NULL,
 segment_count INTEGER NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_v3_documents_owner ON v3_documents(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS v3_chunks (
 doc_id TEXT NOT NULL REFERENCES v3_documents(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES v3_users(id) ON DELETE CASCADE,
 segment INTEGER NOT NULL,
 body TEXT NOT NULL,
 PRIMARY KEY(doc_id,segment)
);
CREATE INDEX IF NOT EXISTS idx_v3_chunks_owner ON v3_chunks(user_id,doc_id);
