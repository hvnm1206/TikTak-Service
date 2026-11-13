-- D1-only: retain original text of uploaded documents. R2 is not needed.
ALTER TABLE v3_documents ADD COLUMN raw_text TEXT;
