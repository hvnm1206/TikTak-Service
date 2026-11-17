-- NMH Bản tin Công nghệ & AI — D1 nmh-news
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  type TEXT NOT NULL DEFAULT 'rss',          -- rss | sitemap
  urls TEXT NOT NULL,                        -- JSON array
  wallclock_tz TEXT,                         -- nguồn ghi sai múi giờ: giờ trong feed coi là múi này
  sitemap_prefix TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,     -- nằm trong danh mục mặc định (sources.json)
  enabled INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,                           -- user tự thêm (NULL = mặc định)
  last_ok_at INTEGER,
  last_error TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS seen_urls (       -- nguồn sitemap: URL đã gặp, để nhận biết bài mới
  source_id TEXT NOT NULL,
  url TEXT NOT NULL,
  first_seen INTEGER NOT NULL,
  PRIMARY KEY (source_id, url)
);

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  source_id TEXT NOT NULL,
  title_orig TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  fetched_at INTEGER NOT NULL,
  title_vi TEXT,
  summary_vi TEXT,
  category TEXT,
  importance INTEGER,
  dup_of INTEGER,
  run_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_articles_pub ON articles (published_at DESC);

CREATE TABLE IF NOT EXISTS runs (            -- mỗi lượt pipeline: số bài, token, ước phí
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  new_articles INTEGER,
  model TEXT,
  input_tokens INTEGER,
  cached_tokens INTEGER,
  output_tokens INTEGER,
  est_usd REAL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                       -- Google sub
  email TEXT,
  name TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_prefs (
  user_id TEXT PRIMARY KEY,
  sources TEXT,                              -- JSON array id nguồn; NULL = tất cả nguồn mặc định
  categories TEXT,                           -- JSON array nhóm; NULL = tất cả
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS usage (           -- chi phí hỏi đáp theo người dùng/ngày
  day TEXT NOT NULL,
  user_id TEXT NOT NULL,
  questions INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  web_searches INTEGER NOT NULL DEFAULT 0,
  tts_chars INTEGER NOT NULL DEFAULT 0,
  est_usd REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (day, user_id)
);

CREATE TABLE IF NOT EXISTS settings (        -- cấu hình dùng chung (danh sách nhóm chủ đề...) do pipeline đồng bộ từ sources.json
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
