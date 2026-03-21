-- ═══════════════════════════════════════════════════════════════════
-- RiP — Complete Database Schema
-- Run this ONCE in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Profiles table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username           text UNIQUE,
  avatar_url         text,
  tier               text DEFAULT 'free' CHECK (tier IN ('free','starter','creator','studio')),
  generations_used   int DEFAULT 0,
  generations_limit  int DEFAULT 3,
  referral_code      text UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  referred_by        text,
  stripe_customer_id text,
  created_at         timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- ── 2. Auto-create profile on signup ──────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to ensure it's up to date
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 3. Creations table ────────────────────────────────────────────
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own creations' AND tablename = 'creations') THEN
    CREATE POLICY "Users can view own creations" ON creations FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own creations' AND tablename = 'creations') THEN
    CREATE POLICY "Users can insert own creations" ON creations FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view public creations' AND tablename = 'creations') THEN
    CREATE POLICY "Users can view public creations" ON creations FOR SELECT USING (is_public = true);
  END IF;
END $$;

-- ── 4. Subscriptions table ────────────────────────────────────────
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own subscriptions' AND tablename = 'subscriptions') THEN
    CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 5. Revenue Events ─────────────────────────────────────────────
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

-- ── 6. Founder Payout Queue ───────────────────────────────────────
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

-- ── 7. Launch Fund Ledger ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS launch_fund_ledger (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL,
  amount_usd  numeric(10,4),
  description text,
  created_at  timestamptz DEFAULT now()
);

-- ── 8. Referrals ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid REFERENCES profiles(id),
  referred_id     uuid REFERENCES profiles(id),
  plan_purchased  text,
  credit_awarded  numeric(10,4),
  created_at      timestamptz DEFAULT now()
);

-- ── 9. RIP Airdrops ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rip_airdrops (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id),
  plan        text,
  rip_amount  int,
  apy         int,
  status      text DEFAULT 'pending',
  created_at  timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- Done! All tables created with RLS policies and auto-profile trigger.
-- ═══════════════════════════════════════════════════════════════════
