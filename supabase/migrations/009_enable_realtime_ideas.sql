-- Enable Supabase Realtime for the ideas table.
-- Migration 003 only added projects and tasks — ideas was missing,
-- so INSERT/UPDATE/DELETE events never reached the frontend.
--
-- Run once in Supabase SQL Editor for project stqhnkhcfndmhgvfyojv.

ALTER PUBLICATION supabase_realtime ADD TABLE ideas;
