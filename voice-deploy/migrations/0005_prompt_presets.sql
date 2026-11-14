-- Per-user editable Prompt templates. Existing Prompt remains untouched.
ALTER TABLE v3_profiles ADD COLUMN presets_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE v3_profiles ADD COLUMN active_preset TEXT NOT NULL DEFAULT '';
