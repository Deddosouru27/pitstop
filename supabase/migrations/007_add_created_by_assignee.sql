-- Add created_by and assignee columns to tasks.
-- Run in Supabase SQL Editor for project stqhnkhcfndmhgvfyojv.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by text DEFAULT 'user';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee text;
