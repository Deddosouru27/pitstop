-- Scrum Workflow: Cycles (Sprints) table
-- Run this in Supabase SQL Editor

-- 1. Create cycles table
CREATE TABLE IF NOT EXISTS cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  description text,
  goal text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (start_date < end_date)
);

-- 2. Add cycle_id to tasks (nullable FK)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES cycles(id) ON DELETE SET NULL;

-- 3. Add status column to tasks for workflow statuses
-- Keep is_completed for backwards compatibility
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status text DEFAULT 'backlog'
  CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'blocked', 'done'));

-- 4. Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cycles_project_id ON cycles(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_cycle_id ON tasks(cycle_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- 5. RLS policies for cycles
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read project cycles"
  ON cycles FOR SELECT
  USING (true);

CREATE POLICY "Users can manage project cycles"
  ON cycles FOR ALL
  USING (true);

-- 6. Test data (optional)
-- INSERT INTO cycles (project_id, name, description, goal, start_date, end_date, status)
-- VALUES (
--   'f2896db9-8eeb-4a15-a49f-7b8571f09dfe',
--   'Sprint 1 (Demo)',
--   'First sprint',
--   'Implement basic workflow',
--   now(),
--   now() + interval '2 weeks',
--   'active'
-- );
