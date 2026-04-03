-- ═══════════════════════════════════════════════════════════════
-- RiP: Missing Tables Migration (v2)
-- Only creates the 5 tables NOT already in the database
-- Existing: profiles, creations, subscriptions, likes, referrals,
--           revenue_events, founder_payout_queue, rip_airdrops,
--           launch_fund_ledger
-- Storage buckets already created via API
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Generations (tracks AI generation usage per user) ─────
CREATE TABLE IF NOT EXISTS generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  creation_type TEXT NOT NULL CHECK (creation_type IN ('script', 'character', 'scene', 'video', 'audio')),
  model TEXT NOT NULL,
  prompt TEXT,
  result JSONB,
  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own generations" ON generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own generations" ON generations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_generations_user_created ON generations(user_id, created_at);
CREATE INDEX idx_generations_type ON generations(creation_type);


-- ── 2. Transactions (revenue tracking, payments, payouts) ────
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('subscription', 'one_time', 'tip', 'payout', 'revenue_split', 'staking_reward')),
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_intent TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX idx_transactions_user ON transactions(user_id, created_at);
CREATE INDEX idx_transactions_type ON transactions(type);


-- ── 3. Staking Positions ($RIP token staking) ────────────────
CREATE TABLE IF NOT EXISTS staking_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  token TEXT DEFAULT 'RIP',
  apy DECIMAL(5, 2) DEFAULT 15.00,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unstaking', 'completed')),
  staked_at TIMESTAMPTZ DEFAULT now(),
  unstake_at TIMESTAMPTZ,
  rewards_earned DECIMAL(18, 8) DEFAULT 0,
  last_reward_at TIMESTAMPTZ DEFAULT now(),
  wallet_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE staking_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own staking" ON staking_positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own staking" ON staking_positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own staking" ON staking_positions FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX idx_staking_user ON staking_positions(user_id, status);


-- ── 4. NFTs (minted content NFTs) ────────────────────────────
CREATE TABLE IF NOT EXISTS nfts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creation_id UUID REFERENCES creations(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token_address TEXT,
  mint_address TEXT,
  collection TEXT DEFAULT 'rip-creations',
  metadata_uri TEXT,
  image_uri TEXT,
  title TEXT NOT NULL,
  description TEXT,
  edition INTEGER DEFAULT 1,
  max_editions INTEGER DEFAULT 1,
  price DECIMAL(18, 8),
  royalty_basis_points INTEGER DEFAULT 500,
  status TEXT DEFAULT 'minted' CHECK (status IN ('pending', 'minted', 'listed', 'sold', 'burned')),
  blockchain TEXT DEFAULT 'solana',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view nfts" ON nfts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creators can insert nfts" ON nfts FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE INDEX idx_nfts_creator ON nfts(creator_id);
CREATE INDEX idx_nfts_creation ON nfts(creation_id);


-- ── 5. Comments (on published creations) ─────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creation_id UUID REFERENCES creations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments" ON comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_comments_creation ON comments(creation_id, created_at);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);


-- ── Storage bucket policies (buckets already created via API) ─
-- Creations bucket (public read, authenticated write)
CREATE POLICY "Public can view creations" ON storage.objects
  FOR SELECT USING (bucket_id = 'creations');
CREATE POLICY "Authenticated users can upload creations" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'creations' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own creations" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'creations' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Avatars bucket
CREATE POLICY "Public can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Exports bucket (private)
CREATE POLICY "Users can view own exports" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can upload exports" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ═══════════════════════════════════════════════════════════════
-- DONE! 5 tables + RLS + indexes + storage policies created.
-- ═══════════════════════════════════════════════════════════════
