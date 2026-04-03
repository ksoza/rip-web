-- ═══════════════════════════════════════════════════════════════════
-- RiP — Complete Database Schema (Canonical)
-- Run this in Supabase SQL Editor for a fresh setup.
-- For existing deployments, run individual migrations instead.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Profiles ───────────────────────────────────────────────────
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 3. Creations ──────────────────────────────────────────────────
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
  thumbnail   text,
  likes_count int DEFAULT 0,
  remix_count int DEFAULT 0,
  view_count  int DEFAULT 0,
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

-- ── 4. Subscriptions ──────────────────────────────────────────────
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

-- ── 5. Generations ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS generations (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  creation_type text NOT NULL CHECK (creation_type IN ('script','character','scene','video','audio')),
  model         text NOT NULL,
  prompt        text,
  result        jsonb,
  tokens_used   int DEFAULT 0,
  duration_ms   int DEFAULT 0,
  success       boolean DEFAULT true,
  error         text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own generations" ON generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own generations" ON generations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_generations_user_created ON generations(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_generations_type ON generations(creation_type);

-- ── 6. Transactions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type                  text NOT NULL CHECK (type IN ('subscription','one_time','tip','payout','revenue_split','staking_reward')),
  amount                decimal(12,2) NOT NULL,
  currency              text DEFAULT 'usd',
  status                text DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  stripe_payment_intent text,
  description           text,
  metadata              jsonb DEFAULT '{}',
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- ── 7. Staking Positions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staking_positions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount          decimal(18,8) NOT NULL,
  token           text DEFAULT 'RIP',
  apy             decimal(5,2) DEFAULT 15.00,
  status          text DEFAULT 'active' CHECK (status IN ('active','unstaking','completed')),
  staked_at       timestamptz DEFAULT now(),
  unstake_at      timestamptz,
  rewards_earned  decimal(18,8) DEFAULT 0,
  last_reward_at  timestamptz DEFAULT now(),
  wallet_address  text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE staking_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own staking" ON staking_positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own staking" ON staking_positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own staking" ON staking_positions FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_staking_user ON staking_positions(user_id, status);

-- ── 8. NFTs ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nfts (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creation_id           uuid REFERENCES creations(id) ON DELETE SET NULL,
  creator_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  token_address         text,
  mint_address          text,
  collection            text DEFAULT 'rip-creations',
  metadata_uri          text,
  image_uri             text,
  title                 text NOT NULL,
  description           text,
  edition               int DEFAULT 1,
  max_editions          int DEFAULT 1,
  price                 decimal(18,8),
  royalty_basis_points  int DEFAULT 500,
  status                text DEFAULT 'minted' CHECK (status IN ('pending','minted','listed','sold','burned')),
  blockchain            text DEFAULT 'solana',
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view nfts" ON nfts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creators can insert nfts" ON nfts FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE INDEX IF NOT EXISTS idx_nfts_creator ON nfts(creator_id);
CREATE INDEX IF NOT EXISTS idx_nfts_creation ON nfts(creation_id);

-- ── 9. Comments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creation_id uuid REFERENCES creations(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id   uuid REFERENCES comments(id) ON DELETE CASCADE,
  content     text NOT NULL CHECK (char_length(content) <= 2000),
  edited      boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments" ON comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_comments_creation ON comments(creation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- ── 10. Revenue Events ────────────────────────────────────────────
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

-- ── 11. Founder Payout Queue ──────────────────────────────────────
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

-- ── 12. Launch Fund Ledger ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS launch_fund_ledger (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL,
  amount_usd  numeric(10,4),
  description text,
  created_at  timestamptz DEFAULT now()
);

-- ── 13. Referrals ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid REFERENCES profiles(id),
  referred_id     uuid REFERENCES profiles(id),
  plan_purchased  text,
  credit_awarded  numeric(10,4),
  created_at      timestamptz DEFAULT now()
);

-- ── 14. RIP Airdrops ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rip_airdrops (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id),
  plan        text,
  rip_amount  int,
  apy         int,
  status      text DEFAULT 'pending',
  created_at  timestamptz DEFAULT now()
);

-- ── 15. Storage Buckets ───────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES
  ('creations', 'creations', true),
  ('avatars', 'avatars', true),
  ('generation-outputs', 'generation-outputs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can view creations" ON storage.objects FOR SELECT USING (bucket_id = 'creations');
CREATE POLICY "Authenticated users can upload creations" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'creations' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own creations" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'creations' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Public can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own generation outputs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'generation-outputs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can upload generation outputs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'generation-outputs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ═══════════════════════════════════════════════════════════════════
-- DONE! 14 tables + RLS + indexes + storage + trigger.
-- ═══════════════════════════════════════════════════════════════════
