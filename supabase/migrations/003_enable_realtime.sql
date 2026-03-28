-- Enable Supabase Realtime for projects and tasks tables.
-- This allows the frontend Realtime subscriptions (useProjects, useTasks) to
-- receive live UPDATE/INSERT/DELETE events without a page reload.
--
-- Run once in Supabase SQL Editor for project stqhnkhcfndmhgvfyojv.

ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
