-- Quản trị: admin tắt nguồn mà không bị pipeline ghi đè khi đồng bộ sources.json
ALTER TABLE sources ADD COLUMN admin_disabled INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles (source_id, published_at DESC);
