-- ═══════════════════════════════════════════════════════════════════
-- RiP Revenue Schema
-- Run this in Supabase SQL editor AFTER creating the profiles table
-- ═══════════════════════════════════════════════════════════════════

-- Creations (AI-generated content)
CREATE TABLE IF NOT EXISTS creations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  show_title  text NOT NULL,
  genre       text,
  type        text,
  title       text,
  logline     text,
  content     text,
  hashtags    text,
  tools_used  text[] DEFAULT '{}',
  is_public   boolean DEFAULT false,
  likes_count int DEFAULT 0,
  remix_count int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE creations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own creations" ON creations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own creations" ON creations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view public creations" ON creations FOR SELECT USING (is_public = true);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_sub_id       text UNIQUE,
  plan                text NOT NULL,
  status              text DEFAULT 'active',
  current_period_end  timestamptz,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Revenue Events
CREATE TABLE IF NOT EXISTS revenue_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES profiles(id),
  plan              text,
  payment_method    text,
  gross_amount      numeric(10,4),
  founder_cut       numeric(10,4),
  launch_fund_cut   numeric(10,4),
  ai_costs_cut      numeric(10,4),
  staking_cut       numeric(10,4),
  ops_cut           numeric(10,4),
  reserve_cut       numeric(10,4),
  tx_hash           text,
  stripe_payment_id text,
  created_at        timestamptz DEFAULT now()
);

-- Founder Payout Queue
CREATE TABLE IF NOT EXISTS founder_payout_queue (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_wallet  text NOT NULL,
  amount_usd          numeric(10,4),
  chain               text DEFAULT 'solana',
  source_user         uuid REFERENCES profiles(id),
  source_plan         text,
  status              text DEFAULT 'pending',
  created_at          timestamptz DEFAULT now()
);

-- Launch Fund Ledger
CREATE TABLE IF NOT EXISTS launch_fund_ledger (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL,
  amount_usd  numeric(10,4),
  description text,
  created_at  timestamptz DEFAULT now()
);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid REFERENCES profiles(id),
  referred_id     uuid REFERENCES profiles(id),
  plan_purchased  text,
  credit_awarded  numeric(10,4),
  created_at      timestamptz DEFAULT now()
);
