-- NGỐ P0 reminders, additive only; does not alter existing V3/Memory V2 data.
CREATE TABLE IF NOT EXISTS nmh_reminders (
 id TEXT PRIMARY KEY NOT NULL,
 user_id TEXT NOT NULL,
 text TEXT NOT NULL,
 due_at_ms INTEGER NOT NULL,
 timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','triggered','canceled')),
 idem_key TEXT NOT NULL,
 fingerprint TEXT NOT NULL,
 created_at_ms INTEGER NOT NULL,
 updated_at_ms INTEGER NOT NULL,
 triggered_at_ms INTEGER,
 UNIQUE(user_id,idem_key)
);
CREATE INDEX IF NOT EXISTS nmh_reminders_due ON nmh_reminders(user_id,status,due_at_ms);
CREATE INDEX IF NOT EXISTS nmh_reminders_dedupe ON nmh_reminders(user_id,fingerprint,created_at_ms);

CREATE TABLE IF NOT EXISTS nmh_reminder_audit (
 id TEXT PRIMARY KEY NOT NULL,
 owner_ref TEXT NOT NULL,
 action_name TEXT NOT NULL,
 reminder_id TEXT,
 phase TEXT NOT NULL,
 error_code TEXT,
 elapsed_ms INTEGER NOT NULL,
 ack_status TEXT NOT NULL,
 created_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS nmh_reminder_audit_ttl ON nmh_reminder_audit(created_at_ms);
-- Retention policy: delete audit entries older than 30 days in a controlled scheduled maintenance job.
-- Never put speech content, medication names, API keys, Google cookies or JWT in audit.
