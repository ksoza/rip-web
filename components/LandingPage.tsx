'use client';
import { useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';

const GENRE_COLORS: Record<string, string> = {
  'TV Show': '#00d4ff', 'Movie': '#ff6b35', 'Anime': '#ff2d78',
  'Cartoon': '#ffcc00', 'News Show': '#8aff00', 'New Show': '#a855f7',
};

const EXAMPLES = [
  { show: 'Breaking Bad',    genre: 'TV Show',   type: 'Alt Ending',    title: 'WALT DISAPPEARS TO OAXACA',    likes: '2.8K' },
  { show: 'Naruto',          genre: 'Anime',     type: 'Add Character', title: 'THE 11TH AKATSUKI MEMBER',     likes: '5.6K' },
  { show: 'SpongeBob',       genre: 'Cartoon',   type: 'New Episode',   title: 'KRABBY PATTY GOES VIRAL',      likes: '9.1K' },
  { show: 'CNN',             genre: 'News Show', type: 'News Remix',    title: 'ANCHOR BREAKS THE 4TH WALL',   likes: '7.2K' },
  { show: 'The Dark Knight', genre: 'Movie',     type: 'New Scene',     title: 'ALFRED MEETS THE JOKER ALONE', likes: '7.4K' },
  { show: 'The Office',      genre: 'TV Show',   type: 'Crossover',     title: 'MICHAEL SCOTT IN WESTEROS',    likes: '11K'  },
];

export function LandingPage() {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [mode, setMode]           = useState<'signin' | 'signup'>('signup');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const supabase = createSupabaseBrowser();

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-bg">

      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-bg/95 backdrop-blur z-50">
        <div className="font-display text-3xl tracking-widest">
          <span className="text-rip">R</span>
          <span className="text-white">i</span>
          <span className="text-cyan">P</span>
          <span className="ml-2 text-xs font-body text-muted tracking-widest uppercase">Remix I.P.</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('signin')} className="text-sm text-muted hover:text-white transition-colors">Sign In</button>
          <button
            onClick={() => { setMode('signup'); document.getElementById('auth-form')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="bg-rip text-white text-sm font-bold px-4 py-2 rounded-lg hover:brightness-110 transition"
          >
            Start Free ☽
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-bg2 border border-border2 rounded-full px-4 py-2 text-xs text-muted uppercase tracking-widest mb-8">
          <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
          $RIP Token Launching in 90 Days · First 10K Wallets Get Free $RIP
        </div>

        <h1 className="font-display text-7xl md:text-9xl tracking-wider text-white leading-none mb-6">
          ANY IP.<br/>
          <span className="text-gradient-rip">YOUR VISION.</span>
        </h1>

        <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed mb-10">
          The world's first AI fan studio. Remix any TV show, movie, anime, cartoon, or news show.
          Generate scripts, alternate endings, new characters, crossovers — powered by Claude AI.
        </p>

        <div className="flex flex-wrap gap-3 justify-center text-sm text-muted mb-16">
          {['TV Shows', 'Movies', 'Anime', 'Cartoons', 'News Shows', 'Crossovers'].map(tag => (
            <span key={tag} className="bg-bg2 border border-border px-3 py-1.5 rounded-full">{tag}</span>
          ))}
        </div>
      </section>

      {/* Example Feed */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="font-display text-3xl tracking-wider text-center text-white mb-10">
          WHAT PEOPLE ARE <span className="text-rip">CREATING</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXAMPLES.map((ex, i) => (
            <div key={i} className="bg-bg2 border border-border rounded-xl p-5 hover:border-bord2 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded text-black uppercase tracking-wide"
                  style={{ backgroundColor: GENRE_COLORS[ex.genre] }}>{ex.genre}</span>
                <span className="text-[10px] text-muted uppercase tracking-wide">{ex.type}</span>
                <span className="ml-auto text-xs text-muted2">♥ {ex.likes}</span>
              </div>
              <p className="text-[11px] text-muted2 italic mb-1">{ex.show}</p>
              <p className="font-display text-lg tracking-wide text-white">{ex.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="font-display text-3xl tracking-wider text-center text-white mb-4">
          PLANS + <span className="text-lime">FREE $RIP ☽</span>
        </h2>
        <p className="text-muted text-sm text-center mb-10">First 10,000 subscribers get free $RIP airdrop on launch day, pre-staked at crazy APY</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { name: 'Free',    price: '$0',  mo: '',     rip: null,    apy: null,   gens: '3 generations', feat: ['Text only', 'Fan Feed access', 'Watermarked'], highlight: false },
            { name: 'Starter', price: '$1',  mo: '/mo',  rip: '500',   apy: '420%', gens: '30 generations', feat: ['Voice TTS', 'Social export', 'No watermark', 'Referral link'], highlight: false },
            { name: 'Creator', price: '$5',  mo: '/mo',  rip: '3,000', apy: '690%', gens: '150 generations', feat: ['Lip sync', 'VidMuse music', 'Voice cloning', 'HD export'], highlight: true },
            { name: 'Studio',  price: '$10', mo: '/mo',  rip: '7,500', apy: '1000%', gens: 'Unlimited', feat: ['All tools', '4K lip sync', 'Full pipeline', 'API access'], highlight: false },
          ].map(plan => (
            <div key={plan.name}
              className={`rounded-xl p-5 border-2 text-center relative ${plan.highlight ? 'border-rip bg-gradient-to-b from-[#0d0408] to-[#080410]' : 'border-border bg-bg2'}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rip text-white text-[9px] font-bold px-3 py-1 rounded-full tracking-wide whitespace-nowrap">
                  ⭐ MOST POPULAR
                </div>
              )}
              <div className="text-[10px] text-muted uppercase tracking-widest mb-2">{plan.name}</div>
              <div className="font-display text-5xl text-white">{plan.price}<span className="text-sm font-body text-muted">{plan.mo}</span></div>
              {plan.rip && (
                <>
                  <div className="text-lime text-sm font-bold mt-2">+ {plan.rip} ☽ $RIP FREE</div>
                  <div className="text-gold text-xs mt-1">🔒 {plan.apy} Pre-Launch APY</div>
                </>
              )}
              <div className="text-[11px] text-muted2 mt-3 mb-4 space-y-1">
                <div className="font-bold text-muted">{plan.gens}</div>
                {plan.feat.map(f => <div key={f}>{f}</div>)}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted2 mt-4">Pay with Card · SOL · XRP · USDC · $RIP (20% off)</p>
      </section>

      {/* Auth Form */}
      <section id="auth-form" className="max-w-md mx-auto px-6 pb-24">
        <div className="bg-bg2 border border-border2 rounded-2xl p-8">
          <h2 className="font-display text-3xl tracking-wider text-white text-center mb-2">
            {mode === 'signup' ? 'START FREE' : 'WELCOME BACK'}
          </h2>
          <p className="text-muted text-sm text-center mb-6">
            {mode === 'signup' ? '3 free generations. No credit card needed.' : 'Sign in to your RiP studio.'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-bg3 border border-border rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-bg3 border border-border rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2"
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-display text-xl tracking-widest text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}
            >
              {loading ? '...' : mode === 'signup' ? '☽  CREATE ACCOUNT' : '☽  SIGN IN'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={() => setMode(m => m === 'signup' ? 'signin' : 'signup')} className="text-xs text-muted hover:text-white transition-colors">
              {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up free"}
            </button>
          </div>

          <p className="text-[10px] text-muted2 text-center mt-4 leading-relaxed">
            All content is fan-made &amp; transformative. Not affiliated with any IP owners.
            13% of all revenue routes to founder wallet automatically.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center">
        <div className="font-display text-2xl tracking-widest mb-2">
          <span className="text-rip">R</span><span className="text-white">i</span><span className="text-cyan">P</span>
          <span className="ml-2 text-xs font-body text-muted2">☽</span>
        </div>
        <p className="text-xs text-muted2 max-w-lg mx-auto">
          Fan-made platform. All referenced IP belongs to respective rights holders.
          RiP is not affiliated with any studios, networks, or creators.
          $RIP is a utility token — not financial advice.
        </p>
      </footer>
    </div>
  );
}
