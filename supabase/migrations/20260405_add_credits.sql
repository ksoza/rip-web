-- ═══════════════════════════════════════════════════════════════════
-- Migration: Add credit system for fal.ai integration
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. Add credits_balance to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS credits_balance int DEFAULT 0;

-- 2. Give existing users starting credits based on their tier
UPDATE profiles SET credits_balance = CASE
  WHEN tier = 'studio'  THEN 1500
  WHEN tier = 'creator' THEN 600
  WHEN tier = 'starter' THEN 200
  ELSE 10  -- Free users get 10 starter credits
END
WHERE credits_balance = 0;

-- 3. Credit transaction history
CREATE TABLE IF NOT EXISTS credit_transactions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount      int NOT NULL,             -- positive = add, negative = deduct
  balance_after int NOT NULL DEFAULT 0,
  reason      text NOT NULL,            -- 'image_generation', 'video_generation', 'subscription_grant', 'daily_bonus', 'pack_purchase'
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own credit transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Service can insert credit transactions"
  ON credit_transactions FOR INSERT
  WITH CHECK (true);  -- Server-side only via service role

CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_tx_reason ON credit_transactions(user_id, reason, created_at DESC);

-- 4. Update generations creation_type check to include new types
ALTER TABLE generations
DROP CONSTRAINT IF EXISTS generations_creation_type_check;

ALTER TABLE generations
ADD CONSTRAINT generations_creation_type_check
CHECK (creation_type IN (
  'script', 'character', 'scene', 'video', 'audio',
  'image', 'sprite', 'faceswap', 'lipsync', 'motion', 'story'
));

-- ═══════════════════════════════════════════════════════════════════
-- DONE! Credits system ready.
-- ═══════════════════════════════════════════════════════════════════
