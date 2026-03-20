'use client';
import { useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';
import { RipLogo } from './RipLogo';

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const supabase = createSupabaseBrowser();

  async function handleGoogleAuth() {
    setGoogleLoading(true); setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setGoogleLoading(false);
    }
  }

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
        <RipLogo size="sm" />
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
          AI Fan Studio · Now in Early Access
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
          <span className="text-lime">PLANS</span>
        </h2>
        <p className="text-muted text-sm text-center mb-10">Start free. Upgrade anytime for more generations and features.</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { name: 'Free',    price: '$0',  mo: '',     gens: '3 generations', feat: ['Text only', 'Fan Feed access', 'Watermarked'], highlight: false },
            { name: 'Starter', price: '$1',  mo: '/mo',  gens: '30 generations', feat: ['Voice TTS', 'Social export', 'No watermark', 'Referral link'], highlight: false },
            { name: 'Creator', price: '$5',  mo: '/mo',  gens: '150 generations', feat: ['Lip sync', 'VidMuse music', 'Voice cloning', 'HD export'], highlight: true },
            { name: 'Studio',  price: '$10', mo: '/mo',  gens: 'Unlimited', feat: ['All tools', '4K lip sync', 'Full pipeline', 'API access'], highlight: false },
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
              
              <div className="text-[11px] text-muted2 mt-3 mb-4 space-y-1">
                <div className="font-bold text-muted">{plan.gens}</div>
                {plan.feat.map(f => <div key={f}>{f}</div>)}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted2 mt-4">Pay with Card</p>
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

          {/* Google Sign In */}
          <button
            onClick={handleGoogleAuth}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-lg text-sm font-bold bg-white text-black hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted2 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

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
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center">
        <div className="flex justify-center mb-2">
          <RipLogo size="sm" />
        </div>
        <p className="text-xs text-muted2 max-w-lg mx-auto">
          Fan-made platform. All referenced IP belongs to respective rights holders.
          RiP is not affiliated with any studios, networks, or creators.
         
        </p>
      </footer>
    </div>
  );
}
