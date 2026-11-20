-- 20/11/2026: daily counters for paid fallbacks (OpenAI web_search when the free Tavily quota is used up; owner cap 5/day).
-- Additive and idempotent: no existing table or row is touched.
CREATE TABLE IF NOT EXISTS ngo_usage_daily(
 day TEXT NOT NULL,
 kind TEXT NOT NULL,
 n INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(day,kind)
);
