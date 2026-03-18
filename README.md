# RiP ☽ Web App
### Remix I.P. — Next.js 15 + Supabase + Stripe

---

## Deploy in 15 Minutes (Zero Cost)

### Step 1 — Supabase (free)
1. Go to https://supabase.com → New Project
2. Copy your `URL` and `anon key` from Settings → API
3. Run the SQL from `revenue-schema.sql` in the SQL editor
4. Also run:
```sql
-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE,
  avatar_url text,
  tier text DEFAULT 'free',
  generations_used int DEFAULT 0,
  generations_limit int DEFAULT 3,
  referral_code text UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  referred_by uuid REFERENCES profiles(id),
  stripe_customer_id text,
  created_at timestamptz DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (new.id, split_part(new.email, '@', 1));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- $RIP airdrops table
CREATE TABLE rip_airdrops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  plan text,
  rip_amount int,
  apy int,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
```

### Step 2 — Stripe (free, % only)
1. Go to https://stripe.com → Dashboard
2. Create 3 products: Starter ($1/mo), Creator ($5/mo), Studio ($10/mo)
3. Copy price IDs → add to `.env`
4. Add webhook endpoint: `https://yoursite.vercel.app/api/webhook`
5. Subscribe to: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`, `invoice.payment_failed`

### Step 3 — Anthropic API
1. Go to https://console.anthropic.com
2. Create API key → add to `.env`

### Step 4 — Deploy to Vercel (free)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (follow prompts)
vercel

# Add environment variables in Vercel dashboard
# Or via CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_PRICE_STARTER
vercel env add STRIPE_PRICE_CREATOR
vercel env add STRIPE_PRICE_STUDIO
vercel env add ANTHROPIC_API_KEY
vercel env add NEXT_PUBLIC_APP_URL

# Redeploy with env vars
vercel --prod
```

### Step 5 — Custom Domain (free on Vercel)
1. Vercel Dashboard → Settings → Domains
2. Add `remixip.com`
3. Update DNS at your registrar

---

## Local Development
```bash
cp .env.example .env.local
# Fill in your keys

npm install
npm run dev
# → http://localhost:3000
```

---

## Architecture

```
rip-web/
├── app/
│   ├── layout.tsx              ← Root: fonts, metadata
│   ├── page.tsx                ← Auth gate: landing or app
│   ├── globals.css             ← Tailwind base
│   └── api/
│       ├── generate/route.ts   ← Claude AI generation (gated by tier)
│       ├── checkout/route.ts   ← Stripe checkout session
│       └── webhook/route.ts    ← Stripe events → revenue routing
├── components/
│   ├── LandingPage.tsx         ← Marketing + auth form
│   ├── AppShell.tsx            ← Authenticated app wrapper
│   ├── studio/StudioTab.tsx    ← AI generation UI
│   └── AllTabs.tsx             ← Feed, Wallet, Revenue, Settings
├── lib/
│   ├── supabase.ts             ← DB client + types
│   └── revenue.ts             ← 13% founder split + all routing logic
└── .env.example               ← All required keys
```

---

## Revenue Flow (Automatic)

Every payment → `/api/webhook` → `lib/revenue.ts`:

| Bucket | % | Destination |
|--------|---|-------------|
| **Founder** | **13%** | **DbnD8vxbNVrG9iL7oi83Zg8RGqxFLATGcW67oq2xD5Nj** |
| Launch Fund | 50% | Supabase ledger → DEX + market maker |
| AI Costs | 15% | API cost allocation |
| Staking | 10% | XRPL staking pool |
| Operations | 7% | Infra costs |
| Reserve | 5% | Emergency fund |

Founder cut:
- **Crypto payments** → routes on-chain instantly
- **Card (Stripe)** → queues in `founder_payout_queue` → sent as SOL every Monday

---

## Tech Stack

| Layer | Tech | Cost |
|-------|------|------|
| Frontend | Next.js 15 | Free (Vercel) |
| Auth + DB | Supabase | Free tier |
| Payments | Stripe | 2.9% + 30¢ only |
| AI | Anthropic Claude | ~$0.003/gen |
| Deployment | Vercel | Free |
| Domain | Any registrar | ~$10/yr |
| **Total fixed cost** | | **$0/mo** |

---

*RiP ☽ — Your universe. Your rules.*
