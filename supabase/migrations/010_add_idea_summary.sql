-- Add summary column to ideas table.
-- Allows bots to store a short human-readable title separate from
-- the raw content. Frontend shows summary on cards, content in modal.
--
-- Run once in Supabase SQL Editor for project stqhnkhcfndmhgvfyojv.

ALTER TABLE ideas ADD COLUMN IF NOT EXISTS summary TEXT;
