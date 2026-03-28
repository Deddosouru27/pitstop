-- Agent Jobs table for runner/autorun tracking
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS agent_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('run', 'autorun')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  payload jsonb NOT NULL DEFAULT '{}',
  result jsonb,
  retry_count integer NOT NULL DEFAULT 0,
  chat_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for quick lookup of running jobs
CREATE INDEX IF NOT EXISTS idx_agent_jobs_status ON agent_jobs(status);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_type_status ON agent_jobs(type, status);

-- RLS
ALTER TABLE agent_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read agent jobs"
  ON agent_jobs FOR SELECT
  USING (true);

CREATE POLICY "Users can manage agent jobs"
  ON agent_jobs FOR ALL
  USING (true);

-- Add 'cancelled' to tasks status if not already there
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled'));

-- Enable realtime for agent_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE agent_jobs;
