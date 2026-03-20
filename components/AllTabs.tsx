// components/feed/FeedTab.tsx
'use client';
import { useState } from 'react';
import type { User } from '@supabase/supabase-js';

const GC: Record<string,string> = {'TV Show':'#00d4ff','Movie':'#ff6b35','Anime':'#ff2d78','Cartoon':'#ffcc00','News Show':'#8aff00','New Show':'#a855f7'};
const FEED = [
  {id:'1',user:'VibeWriter99',show:'Breaking Bad',genre:'TV Show',type:'Alt Ending',title:'WALT DISAPPEARS TO OAXACA',preview:"Instead of dying in the lab, Walt bribes a cartel contact — found 10 years later running a taco stand in Oaxaca...",likes:2847,remixes:142},
  {id:'2',user:'AnimeKing_X',show:'Naruto',genre:'Anime',type:'Add Character',title:'THE 11TH AKATSUKI MEMBER',preview:"A rogue Sand jonin with kekkei genkai joins with a secret mission to destroy Pain from within...",likes:5621,remixes:389},
  {id:'3',user:'CartoonHead',show:'SpongeBob',genre:'Cartoon',type:'New Episode',title:'KRABBY PATTY GOES VIRAL',preview:"When a tourist video hits 10B views, Mr. Krabs faces an impossible choice: franchise or protect the formula...",likes:9102,remixes:712},
  {id:'4',user:'NewsRemixer',show:'CNN',genre:'News Show',type:'News Remix',title:'ANCHOR BREAKS THE 4TH WALL',preview:"Mid-broadcast the anchor stops, looks into camera, and reads the script they were never supposed to air...",likes:7200,remixes:501},
  {id:'5',user:'CinephileDave',show:'The Dark Knight',genre:'Movie',type:'New Scene',title:'ALFRED MEETS THE JOKER ALONE',preview:"A deleted scene: Alfred and the Joker — no Batman, no weapons, just two men who know Bruce's secret...",likes:7455,remixes:501},
  {id:'6',user:'MemeCreator9',show:'The Office',genre:'TV Show',type:'Crossover',title:'MICHAEL SCOTT IN WESTEROS',preview:"Michael Scott named the new Hand of the King. First decree: everyone gets a Dundie...",likes:11203,remixes:890},
];

export function FeedTab({ user }: { user: User }) {
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [likes, setLikes] = useState<Record<string,number>>(Object.fromEntries(FEED.map(f => [f.id, f.likes])));

  function toggleLike(id: string) {
    setLiked(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    setLikes(prev => ({ ...prev, [id]: liked.has(id) ? prev[id] - 1 : prev[id] + 1 }));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-4xl tracking-widest text-white">FAN <span className="text-rip">FEED</span></h1>
        <p className="text-muted text-sm mt-1">Latest remixes from the community</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FEED.map(item => (
          <div key={item.id} className="bg-bg2 border border-border rounded-xl p-5 hover:border-bord2 transition-colors">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded text-black uppercase tracking-wide" style={{ backgroundColor: GC[item.genre] }}>{item.genre}</span>
              <span className="text-[10px] text-muted">{item.type}</span>
              <span className="ml-auto text-[10px] text-muted2">@{item.user}</span>
            </div>
            <p className="text-[10px] text-muted2 italic mb-1">{item.show}</p>
            <p className="font-display text-xl tracking-wide text-white mb-2 leading-tight">{item.title}</p>
            <p className="text-xs text-white/40 leading-relaxed mb-4">{item.preview}</p>
            <div className="flex items-center gap-3">
              <button onClick={() => toggleLike(item.id)} className={`text-sm transition-colors ${liked.has(item.id) ? 'text-rip' : 'text-muted hover:text-white'}`}>
                {liked.has(item.id) ? '♥' : '♡'} {likes[item.id].toLocaleString()}
              </button>
              <button className="text-xs text-muted border border-border rounded px-2.5 py-1 hover:border-cyan hover:text-cyan transition-colors">⚡ Remix</button>
              <span className="ml-auto text-[10px] text-muted2">{item.remixes} remixes</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// components/wallet/WalletTab.tsx
import { useEffect, useRef } from 'react';

function useCountdown(ms: number) {
  const [t, setT] = useState(ms);
  useEffect(() => { const id = setInterval(() => setT(x => Math.max(0, x - 1000)), 1000); return () => clearInterval(id); }, []);
  return { d: Math.floor(t/86400000), h: Math.floor(t%86400000/3600000), m: Math.floor(t%3600000/60000), s: Math.floor(t%60000/1000) };
}

export function WalletTab({ user }: { user: User }) {
  const { d, h, m, s } = useCountdown(90 * 86400000);
  const [stakeIdx, setStakeIdx] = useState(2);
  const [stakeAmt, setStakeAmt] = useState(1000);
  const [staked, setStaked]     = useState(false);
  const [stakerCount, setStakerCount] = useState(0);
  const [ripRes, setRipRes]     = useState(0);
  const [fund, setFund]         = useState(0);

  const tiers = [
    { days: 30,  apy: 420,  postApy: 40  },
    { days: 90,  apy: 690,  postApy: 80  },
    { days: 180, apy: 1000, postApy: 150 },
  ];
  const tier   = tiers[stakeIdx];
  const earned = Math.round(stakeAmt * (tier.apy / 100) * (tier.days / 365));

  useEffect(() => {
    const id = setInterval(() => {
      setStakerCount(c => c + 1);
      setRipRes(r => r + [500,3000,7500][Math.floor(Math.random()*3)]);
      setFund(f => f + [0.5,2.5,5][Math.floor(Math.random()*3)]);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl tracking-widest text-white">☽ WALLET <span className="text-rip">&amp; STAKE</span></h1>
        <p className="text-muted text-sm mt-1">Pre-launch staking, $RIP balance, and revenue share</p>
      </div>

      {/* Countdown */}
      <div className="rounded-xl border border-[#3a0a2a] p-5" style={{ background: 'linear-gradient(135deg,#0d0208,#0a0412)' }}>
        <div className="inline-block bg-rip text-white font-display text-xs tracking-widest px-3 py-1.5 rounded mb-4">$RIP LAUNCHES IN</div>
        <div className="flex gap-3 mb-4">
          {[{v:d,l:'DAYS'},{v:h,l:'HRS'},{v:m,l:'MIN'},{v:s,l:'SEC'}].map(({v,l}) => (
            <div key={l} className="text-center">
              <div className="bg-bg3 border border-bord2 rounded-lg px-3 py-2 min-w-[60px]">
                <div className="font-display text-3xl text-white tracking-wide text-center">{String(v).padStart(2,'0')}</div>
              </div>
              <div className="text-[8px] text-muted uppercase tracking-widest mt-1.5">{l}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/30 leading-relaxed max-w-lg mb-4">Studio launches first. $RIP deploys 90 days later on pump.fun → Raydium → XRPL. Lock in pre-launch APY — these rates will never exist again.</p>
        <div className="grid grid-cols-4 gap-px bg-border rounded-lg overflow-hidden">
          {[{l:'Hard Cap',v:'63M ☽',c:'text-rip'},{l:'Pre-Stakers',v:stakerCount.toString(),c:'text-lime'},{l:'$RIP Reserved',v:ripRes.toLocaleString(),c:'text-cyan'},{l:'Launch Fund',v:'$'+fund.toFixed(0),c:'text-gold'}].map(s => (
            <div key={s.l} className="bg-bg3 px-3 py-2.5">
              <div className="text-[8px] text-muted uppercase tracking-wide mb-1">{s.l}</div>
              <div className={`font-display text-lg tracking-wide ${s.c}`}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Balance */}
      <div className="rounded-xl border border-bord2 p-5" style={{ background: 'linear-gradient(135deg,#0a0208,#08040f)' }}>
        <div className="text-[9px] text-muted uppercase tracking-widest mb-2">$RIP Balance</div>
        <div className="font-display text-5xl text-white tracking-wider mb-1"><span className="text-rip">☽</span> 0.000000</div>
        <div className="text-muted font-mono text-xs mb-4">≈ $0.00 USD · Pre-launch price: <strong className="text-gold">TBD at launch</strong></div>
        <div className="flex gap-3">
          <button className="flex-1 py-2.5 rounded-lg text-sm font-bold border transition-colors" style={{ background: 'rgba(168,85,247,.1)', borderColor: 'rgba(168,85,247,.3)', color: '#a855f7' }}>💜 Connect Phantom</button>
          <button className="flex-1 py-2.5 rounded-lg text-sm font-bold border transition-colors" style={{ background: 'rgba(122,184,255,.08)', borderColor: 'rgba(122,184,255,.25)', color: '#7ab8ff' }}>🔵 Connect XUMM</button>
        </div>
      </div>

      {/* Staking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          {tiers.map((t, i) => (
            <button key={i} onClick={() => setStakeIdx(i)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${stakeIdx === i ? 'border-lime bg-lime/5' : 'border-border bg-bg2 hover:border-bord2'}`}>
              <div className={`font-display text-2xl ${stakeIdx === i ? 'text-lime' : 'text-white'}`}>{t.days}D</div>
              <div>
                <div className="text-[9px] text-muted uppercase tracking-wide mb-1">Lock Period</div>
                <div className={`font-display text-xl ${stakeIdx === i ? 'text-lime' : 'text-white'}`}>{t.apy}% APY</div>
                <div className="text-[10px] text-muted">Pre-launch only · ~{t.postApy}% after</div>
              </div>
              <div className={`ml-auto w-4 h-4 rounded-full border-2 ${stakeIdx === i ? 'bg-lime border-lime' : 'border-bord2'}`} />
            </button>
          ))}
        </div>

        <div className="bg-bg2 border border-border rounded-xl p-5">
          <div className="text-[9px] text-muted uppercase tracking-widest mb-4">Stake Calculator</div>
          <div className="flex gap-2 mb-4">
            {[500,1000,3000,7500].map(v => (
              <button key={v} onClick={() => setStakeAmt(v)}
                className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold transition-all ${stakeAmt === v ? 'border-lime text-lime bg-lime/5 border' : 'border-bord2 text-muted border bg-bg3'}`}>
                {v >= 1000 ? v/1000+'K' : v}
              </button>
            ))}
          </div>
          <div className="space-y-2 mb-4">
            {[['Lock Period', tier.days+' days', ''],['APY', tier.apy+'%', 'text-lime'],['$RIP Earned', earned.toLocaleString(), 'text-lime'],['Total After', (stakeAmt+earned).toLocaleString(), 'text-rip']].map(([l,v,c]) => (
              <div key={l} className="flex justify-between bg-bg3 rounded-lg px-3 py-2">
                <span className="text-xs text-muted">{l}</span>
                <span className={`text-sm font-bold font-mono ${c}`}>{v}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setStaked(true)}
            className={`w-full py-3 rounded-lg font-display text-lg tracking-widest transition-all ${staked ? 'text-lime border border-lime/30' : 'text-lime border border-lime/30 hover:brightness-110'}`}
            style={{ background: 'linear-gradient(90deg,#1a4a00,#2a7a00)' }}>
            {staked ? `✓ STAKED ${stakeAmt.toLocaleString()} ☽` : `🔒 STAKE NOW`}
          </button>
        </div>
      </div>
    </div>
  );
}


// components/wallet/RevenueTab.tsx
export function RevenueTab({ user }: { user: User }) {
  const [totals, setTotals] = useState({ f:0, l:0, a:0, s:0, o:0, r:0, gross:0 });
  const [events, setEvents] = useState<any[]>([]);

  function simulate() {
    const plans = [{n:'Starter',p:1},{n:'Creator',p:5},{n:'Studio',p:10}];
    const methods = ['Card','SOL','XRP','USDC','$RIP'];
    const plan = plans[Math.floor(Math.random()*3)];
    const mt   = methods[Math.floor(Math.random()*5)];
    const g    = plan.p;
    setTotals(t => ({ gross:t.gross+g, f:t.f+g*.13, l:t.l+g*.50, a:t.a+g*.15, s:t.s+g*.10, o:t.o+g*.07, r:t.r+g*.05 }));
    setEvents(ev => [{ plan:plan.n, mt, g, f:g*.13, l:g*.50, t:new Date().toLocaleTimeString() }, ...ev.slice(0,7)]);
  }

  const splits = [
    { pct:13, label:'Founder Wallet', desc:'→ DbnD8vxbNVrG9iL7oi83Zg8RGqxFLATGcW67oq2xD5Nj', color:'#ff2d78', val:totals.f, bg:'from-[#0d0610] to-[#0a0408]', full:true },
    { pct:50, label:'$RIP Launch Fund', desc:'DEX liquidity · Market maker · Airdrop', color:'#8aff00', val:totals.l, bg:'from-[#040a04] to-[#030803]', full:false },
    { pct:15, label:'AI API Costs', desc:'Anthropic · ElevenLabs · Replicate', color:'#00d4ff', val:totals.a, bg:'from-[#04080a] to-[#030608]', full:false },
    { pct:10, label:'Staking Pool', desc:'$RIP holders · XRPL revenue share', color:'#ffcc00', val:totals.s, bg:'from-[#0a0a04] to-[#080803]', full:false },
    { pct: 7, label:'Operations', desc:'Hosting · Infra · Maintenance', color:'#a855f7', val:totals.o, bg:'from-[#080408] to-[#060306]', full:false },
    { pct: 5, label:'Reserve Fund', desc:'Emergency · Legal · Compliance', color:'#555', val:totals.r, bg:'from-[#040808] to-[#030606]', full:false },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl tracking-widest text-white">REVENUE <span className="text-rip">SPLITS</span></h1>
        <p className="text-muted text-sm mt-1">Every dollar auto-distributed on every payment</p>
      </div>

      <div className={`rounded-xl border border-[#1c0a1a] p-5 bg-gradient-to-br from-[#080408] to-[#060208]`}>
        <div className="text-[9px] text-muted uppercase tracking-widest mb-2">Total Gross Revenue</div>
        <div className="font-display text-6xl text-white">${totals.gross.toFixed(2)}</div>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-lime animate-pulse" />
          <span className="text-lime text-xs font-bold">LIVE ROUTING</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {splits.map((sp) => (
          <div key={sp.label} className={`rounded-xl border p-4 bg-gradient-to-br ${sp.bg} relative overflow-hidden ${sp.full ? 'col-span-full' : ''}`}
            style={{ borderColor: sp.color + '44' }}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: sp.color }} />
            <div className="font-display text-4xl mb-2" style={{ color: sp.color }}>{sp.pct}%</div>
            <div className="text-sm font-bold text-white mb-1">{sp.label}</div>
            <div className="text-xs text-white/30 mb-3 font-mono leading-relaxed break-all">{sp.desc}</div>
            <div className="font-mono text-sm font-bold" style={{ color: sp.color }}>${sp.val.toFixed(2)}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-[9px] text-muted uppercase tracking-widest">Revenue Event Log</div>
        <button onClick={simulate} className="text-xs text-muted border border-bord2 rounded-lg px-3 py-1.5 hover:border-rip hover:text-rip transition-colors">+ Simulate Payment</button>
      </div>

      <div className="bg-bg2 border border-border rounded-xl overflow-hidden">
        {events.length === 0 ? (
          <div className="py-10 text-center text-muted2 text-sm">☽ &nbsp;Click "Simulate Payment" to test split routing</div>
        ) : events.map((e, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-none">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase bg-[#1a0a12] text-rip border border-[#3a1a2a]">FOUNDER</span>
            <div className="flex-1">
              <div className="text-sm font-bold text-white/80">{e.plan} — {e.mt}</div>
              <div className="text-[10px] text-muted">13% → DbnD...D5Nj</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-rip font-mono">+${e.f.toFixed(2)}</div>
              <div className="text-[10px] text-muted2">{e.t}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// components/wallet/SettingsTab.tsx
export function SettingsTab({ user, profile, onSignOut }: any) {
  const [copied, setCopied] = useState('');

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(''), 2000);
  }

  function Row({ label, desc, action, actionLabel, actionKey }: any) {
    return (
      <div className="flex items-center bg-bg2 border border-border rounded-xl px-4 py-3 gap-4 mb-2">
        <div className="flex-1">
          <div className="text-sm font-semibold text-white">{label}</div>
          {desc && <div className="text-xs text-muted mt-0.5 break-all">{desc}</div>}
        </div>
        {action && (
          <button onClick={action} className={`text-xs border rounded-lg px-3 py-1.5 transition-colors shrink-0 ${copied === actionKey ? 'border-lime text-lime' : 'border-bord2 text-muted hover:border-rip hover:text-rip'}`}>
            {copied === actionKey ? '✓ Copied' : actionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-widest text-white">SET<span className="text-rip">TINGS</span></h1>
        <p className="text-muted text-sm mt-1">Account configuration and preferences</p>
      </div>

      <div>
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Account</div>
        <Row label="Email" desc={user.email} />
        <Row label="Username" desc={profile?.username || '—'} action={() => {}} actionLabel="Edit" actionKey="username" />
        <Row label="Plan" desc={`${profile?.tier || 'free'} · ${profile?.generations_limit - profile?.generations_used || 0} generations remaining`} action={() => {}} actionLabel="Upgrade" actionKey="plan" />
        <Row label="Referral Link"
          desc={`remixip.com/ref/${profile?.username || 'you'}`}
          action={() => copy(`https://remixip.com/ref/${profile?.username}`, 'referral')}
          actionLabel="Copy"
          actionKey="referral"
        />
      </div>

      <div>
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Legal</div>
        <Row label="Content Policy" desc="All content is fan-made and transformative. Not affiliated with any IP owners." />
        <Row label="App Version" desc="RiP Web v1.0.0 · remixip.icu" />
      </div>

      <button onClick={onSignOut} className="w-full py-3 rounded-xl text-sm font-bold text-muted border border-border hover:border-rip hover:text-rip transition-colors">
        Sign Out
      </button>
    </div>
  );
}
