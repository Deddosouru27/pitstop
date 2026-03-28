-- Project settings: deploy URL, autorun toggle, Definition of Done items.
-- Run in Supabase SQL Editor for project stqhnkhcfndmhgvfyojv.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deploy_url text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS autorun_enabled boolean DEFAULT true;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS dod_items text[] DEFAULT '{}';
