-- Add status column to ideas for triage workflow
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'dismissed', 'deferred'));

-- Backfill: existing rows get 'pending'
UPDATE ideas SET status = 'pending' WHERE status IS NULL;
