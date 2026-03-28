-- Add project_id to agent_jobs so bot activity can be filtered per project.
-- Run in Supabase SQL Editor for project stqhnkhcfndmhgvfyojv.

ALTER TABLE agent_jobs ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id);
