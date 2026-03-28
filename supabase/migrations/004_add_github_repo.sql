-- Add github_repo field to projects table.
-- Used by autorun agent to know which repo to commit to.
-- Run in Supabase SQL Editor for project stqhnkhcfndmhgvfyojv.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_repo text;
