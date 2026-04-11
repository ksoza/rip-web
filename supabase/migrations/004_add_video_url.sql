-- Migration 004: Add video_url and fix thumbnail in creations table
-- The creations table was missing video_url (needed for playback in WatchPage/Feed)
-- and PublishFlow wasn't inserting thumbnail.

-- Add video_url column
ALTER TABLE creations ADD COLUMN IF NOT EXISTS video_url text;

-- Add index for feed queries
CREATE INDEX IF NOT EXISTS idx_creations_public_recent ON creations (is_public, created_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_creations_show_title ON creations (show_title) WHERE is_public = true;

-- Comment for documentation
COMMENT ON COLUMN creations.video_url IS 'URL to the generated video file (fal.ai CDN or Supabase Storage)';
