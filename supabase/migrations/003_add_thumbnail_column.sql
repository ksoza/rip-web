-- ═══════════════════════════════════════════════════════════════
-- RiP: Add thumbnail column to creations table
-- Run via: Supabase Dashboard → SQL Editor → paste & run
-- ═══════════════════════════════════════════════════════════════

-- Add thumbnail URL column to creations (used by DiscoverTab, CreatorProfile, WatchPage, PublishFlow)
ALTER TABLE creations ADD COLUMN IF NOT EXISTS thumbnail text;

-- Add view_count column (used by CreatorProfile for engagement stats)
ALTER TABLE creations ADD COLUMN IF NOT EXISTS view_count int DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════
-- DONE! Columns added. Existing rows will have NULL thumbnail
-- and 0 view_count.
-- ═══════════════════════════════════════════════════════════════
