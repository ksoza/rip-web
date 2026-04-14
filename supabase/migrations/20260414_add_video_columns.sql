-- Migration: Add video_url, audio_url, art_style to creations
-- Required for publish flow and $0 pipeline
-- Run in Supabase SQL Editor if not auto-applied

ALTER TABLE creations ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE creations ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE creations ADD COLUMN IF NOT EXISTS art_style text DEFAULT 'source-faithful';

-- Index for filtering by art style
CREATE INDEX IF NOT EXISTS idx_creations_art_style ON creations(art_style);

-- Update schema SQL to match (keep in sync with supabase-schema.sql)
COMMENT ON COLUMN creations.video_url IS 'URL to generated video (Supabase Storage or external)';
COMMENT ON COLUMN creations.audio_url IS 'URL to generated audio track';
COMMENT ON COLUMN creations.art_style IS 'Art style used for generation (source-faithful, claymation, etc.)';
