// components/wallet/WalletTab.tsx
// $RIP Token + Wallet Management — connect Solana/XRPL wallets, view balances
'use client';
import { useState, useEffect } from 'react';

// ── Types ───────────────────────────────────────────────────────
interface WalletState {
  connected: boolean;
  chain: 'solana' | 'xrpl' | null;
  address: string;
  balance: string;
  tokens: TokenBalance[];
}

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  value: string;
  icon: string;
  change: number;
}

interface Transaction {
  id: string;
  type: 'mint' | 'transfer' | 'stake' | 'reward' | 'purchase';
  amount: string;
  token: string;
  from: string;
  to: string;
  timestamp: number;
  status: 'confirmed' | 'pending';
}

type WalletView = 'portfolio' | 'nfts' | 'staking' | 'history';

// ── Mock data (replaced by real API calls once wallets connect) ──
const MOCK_TOKENS: TokenBalance[] = [
  { symbol: '$RIP', name: 'Remix IP Token', balance: '12,450', value: '$124.50', icon: '☽', change: 5.2 },
  { symbol: 'SOL', name: 'Solana', balance: '3.42', value: '$456.78', icon: '◎', change: -1.3 },
  { symbol: 'USDC', name: 'USD Coin', balance: '89.00', value: '$89.00', icon: '💲', change: 0 },
];

const MOCK_TXS: Transaction[] = [
  { id: '1', type: 'reward', amount: '+500 $RIP', token: '$RIP', from: 'RiP Protocol', to: 'You', timestamp: Date.now() - 3600000, status: 'confirmed' },
  { id: '2', type: 'mint', amount: '-0.05 SOL', token: 'SOL', from: 'You', to: 'Metaplex', timestamp: Date.now() - 86400000, status: 'confirmed' },
  { id: '3', type: 'stake', amount: '-2,000 $RIP', token: '$RIP', from: 'You', to: 'Staking Pool', timestamp: Date.now() - 172800000, status: 'confirmed' },
  { id: '4', type: 'purchase', amount: '-$5.00', token: 'USDC', from: 'You', to: 'Creator Plan', timestamp: Date.now() - 259200000, status: 'confirmed' },
];

// ── Revenue Split Config ────────────────────────────────────────
const REVENUE_SPLIT = [
  { label: 'Founder', pct: 13, color: '#ff2d78' },
  { label: 'Launch Fund', pct: 50, color: '#00d4ff' },
  { label: 'AI Costs', pct: 15, color: '#a855f7' },
  { label: 'Staking Rewards', pct: 10, color: '#8aff00' },
  { label: 'Operations', pct: 7, color: '#ffcc00' },
  { label: 'Reserve', pct: 5, color: '#f97316' },
];

export function WalletTab() {
  const [view, setView] = useState<WalletView>('portfolio');
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    chain: null,
    address: '',
    balance: '0',
    tokens: [],
  });
  const [connectDialog, setConnectDialog] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('');
  const [staking, setStaking] = useState(false);

  // Simulate wallet connection
  const connectWallet = (chain: 'solana' | 'xrpl') => {
    setWallet({
      connected: true,
      chain,
      address: chain === 'solana'
        ? 'DbnD8vxbNVrG9iL7oi83Zg8RGqxFLATGcW67oq2xD5Nj'
        : 'rN7n3473SoLGDGdrgWUVBBdUzmaTEhkr8p',
      balance: chain === 'solana' ? '3.42 SOL' : '1,250 XRP',
      tokens: MOCK_TOKENS,
    });
    setConnectDialog(false);
  };

  const disconnectWallet = () => {
    setWallet({ connected: false, chain: null, address: '', balance: '0', tokens: [] });
  };

  const VIEW_TABS: { id: WalletView; label: string; icon: string }[] = [
    { id: 'portfolio', label: 'Portfolio', icon: '💰' },
    { id: 'nfts', label: 'NFTs', icon: '💎' },
    { id: 'staking', label: 'Staking', icon: '🔒' },
    { id: 'history', label: 'History', icon: '📜' },
  ];

  return (
    <div className="min-h-screen bg-bg text-white p-4 pb-24">
      {/* ── Wallet Header ──────────────────────────────── */}
      <div className="max-w-3xl mx-auto">
        {!wallet.connected ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">☽</div>
            <h1 className="font-display text-3xl text-white mb-2">Connect Your Wallet</h1>
            <p className="text-sm text-muted mb-8 max-w-md mx-auto">
              Link your Solana or XRPL wallet to manage $RIP tokens, mint NFTs, stake rewards, and view your creator portfolio.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => connectWallet('solana')}
                className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all"
                style={{ background: 'linear-gradient(135deg, #9945FF, #14F195)' }}>
                <span className="text-lg">◎</span>
                Connect Solana
              </button>
              <button onClick={() => connectWallet('xrpl')}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-bg2 border border-border rounded-2xl text-sm font-bold text-white hover:border-cyan transition-all">
                <span className="text-lg">✕</span>
                Connect XRPL
              </button>
            </div>

            {/* $RIP Token Info */}
            <div className="mt-12 bg-bg2 border border-border rounded-2xl p-6 max-w-md mx-auto">
              <h3 className="font-display text-lg text-rip mb-3">$RIP Token</h3>
              <p className="text-xs text-muted leading-relaxed mb-4">
                The native utility token of Remix IP. Earn by creating, stake for premium access, use for NFT minting fees, and receive revenue share from the protocol.
              </p>

              {/* Revenue split visualization */}
              <div className="space-y-2">
                <p className="text-[9px] text-muted uppercase tracking-widest">Revenue Distribution</p>
                <div className="h-3 rounded-full overflow-hidden flex">
                  {REVENUE_SPLIT.map(s => (
                    <div key={s.label} style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                      title={`${s.label}: ${s.pct}%`} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {REVENUE_SPLIT.map(s => (
                    <div key={s.label} className="flex items-center gap-1 text-[9px]">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-muted">{s.label}</span>
                      <span className="text-white">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Connected wallet header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: wallet.chain === 'solana' ? 'linear-gradient(135deg, #9945FF, #14F195)' : 'linear-gradient(135deg, #23292F, #3B82F6)' }}>
                  {wallet.chain === 'solana' ? '◎' : '✕'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-lime animate-pulse" />
                    <span className="text-xs text-lime uppercase font-bold">Connected</span>
                  </div>
                  <p className="text-xs text-muted font-mono">
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </p>
                </div>
              </div>
              <button onClick={disconnectWallet}
                className="px-3 py-1.5 bg-bg2 border border-border rounded-lg text-xs text-muted hover:text-rip hover:border-rip transition">
                Disconnect
              </button>
            </div>

            {/* Total Balance */}
            <div className="bg-bg2 border border-border rounded-2xl p-6 mb-4 text-center">
              <p className="text-[9px] text-muted uppercase tracking-widest mb-1">Total Portfolio</p>
              <h2 className="font-display text-4xl text-white">$670.28</h2>
              <p className="text-sm text-lime mt-1">↑ $12.50 (1.9%) today</p>
            </div>

            {/* View tabs */}
            <div className="flex gap-1 mb-4 bg-bg2 rounded-xl p-1">
              {VIEW_TABS.map(t => (
                <button key={t.id} onClick={() => setView(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                    view === t.id ? 'bg-bg3 text-white' : 'text-muted hover:text-white'
                  }`}>
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* PORTFOLIO VIEW */}
            {view === 'portfolio' && (
              <div className="space-y-2">
                {wallet.tokens.map(token => (
                  <div key={token.symbol} className="flex items-center gap-3 bg-bg2 border border-border rounded-xl p-4">
                    <div className="w-10 h-10 rounded-full bg-bg3 flex items-center justify-center text-xl">
                      {token.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{token.symbol}</span>
                        <span className="text-xs text-muted">{token.name}</span>
                      </div>
                      <p className="text-xs text-muted">{token.balance} tokens</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{token.value}</p>
                      <p className={`text-xs ${token.change > 0 ? 'text-lime' : token.change < 0 ? 'text-rip' : 'text-muted'}`}>
                        {token.change > 0 ? '↑' : token.change < 0 ? '↓' : '–'} {Math.abs(token.change)}%
                      </p>
                    </div>
                  </div>
                ))}

                {/* Quick actions */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <button className="bg-bg2 border border-border rounded-xl p-3 text-center hover:border-cyan transition">
                    <div className="text-lg mb-1">📤</div>
                    <div className="text-[10px] text-muted">Send</div>
                  </button>
                  <button className="bg-bg2 border border-border rounded-xl p-3 text-center hover:border-cyan transition">
                    <div className="text-lg mb-1">📥</div>
                    <div className="text-[10px] text-muted">Receive</div>
                  </button>
                  <button onClick={() => setView('staking')}
                    className="bg-bg2 border border-border rounded-xl p-3 text-center hover:border-lime transition">
                    <div className="text-lg mb-1">🔒</div>
                    <div className="text-[10px] text-muted">Stake</div>
                  </button>
                </div>
              </div>
            )}

            {/* NFTS VIEW */}
            {view === 'nfts' && (
              <div>
                <div className="text-center py-8">
                  <div className="text-5xl mb-4 opacity-30">💎</div>
                  <p className="text-sm text-muted mb-2">No NFTs minted yet</p>
                  <p className="text-xs text-muted2">Create content in the Studio, then publish as NFTs</p>
                  <button className="mt-4 px-4 py-2 bg-rip text-white text-xs font-bold rounded-xl">
                    Go to Studio →
                  </button>
                </div>
              </div>
            )}

            {/* STAKING VIEW */}
            {view === 'staking' && (
              <div className="space-y-4">
                {/* Staking stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-bg2 border border-border rounded-xl p-4 text-center">
                    <p className="text-[9px] text-muted uppercase">Staked</p>
                    <p className="font-display text-2xl text-lime">2,000 $RIP</p>
                  </div>
                  <div className="bg-bg2 border border-border rounded-xl p-4 text-center">
                    <p className="text-[9px] text-muted uppercase">APY</p>
                    <p className="font-display text-2xl text-gold">24.5%</p>
                  </div>
                  <div className="bg-bg2 border border-border rounded-xl p-4 text-center">
                    <p className="text-[9px] text-muted uppercase">Rewards</p>
                    <p className="font-display text-2xl text-cyan">482 $RIP</p>
                  </div>
                  <div className="bg-bg2 border border-border rounded-xl p-4 text-center">
                    <p className="text-[9px] text-muted uppercase">Lock Period</p>
                    <p className="font-display text-2xl text-muted">30 days</p>
                  </div>
                </div>

                {/* Stake form */}
                <div className="bg-bg2 border border-border rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-3">Stake $RIP</h3>
                  <p className="text-xs text-muted mb-4">
                    Stake your $RIP tokens to earn rewards and unlock premium features. 10% of platform revenue is distributed to stakers.
                  </p>
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={stakeAmount}
                      onChange={e => setStakeAmount(e.target.value)}
                      placeholder="Amount to stake..."
                      className="flex-1 bg-bg3 border border-border rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-lime" />
                    <button onClick={() => setStakeAmount('12450')}
                      className="px-3 py-2 bg-bg3 border border-border rounded-lg text-xs text-muted hover:text-white">
                      MAX
                    </button>
                  </div>
                  <button disabled={!stakeAmount || staking}
                    className="w-full py-3 rounded-xl text-sm font-bold text-black bg-lime hover:brightness-110 transition disabled:opacity-50">
                    {staking ? 'Staking...' : '🔒 Stake $RIP'}
                  </button>
                </div>

                {/* Revenue split */}
                <div className="bg-bg2 border border-border rounded-xl p-4">
                  <h3 className="text-sm font-bold text-white mb-3">Revenue Distribution</h3>
                  <div className="space-y-2">
                    {REVENUE_SPLIT.map(s => (
                      <div key={s.label} className="flex items-center gap-3">
                        <span className="text-xs text-white w-24">{s.label}</span>
                        <div className="flex-1 h-2 bg-bg3 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                        </div>
                        <span className="text-xs text-muted w-8 text-right">{s.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* HISTORY VIEW */}
            {view === 'history' && (
              <div className="space-y-2">
                {MOCK_TXS.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 bg-bg2 border border-border rounded-xl p-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                      tx.type === 'reward' ? 'bg-lime/20' :
                      tx.type === 'mint' ? 'bg-purple/20' :
                      tx.type === 'stake' ? 'bg-cyan/20' :
                      'bg-gold/20'
                    }`}>
                      {tx.type === 'reward' ? '🎁' :
                       tx.type === 'mint' ? '💎' :
                       tx.type === 'stake' ? '🔒' :
                       '🛒'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white capitalize">{tx.type}</span>
                        <span className={`text-xs font-bold ${
                          tx.amount.startsWith('+') ? 'text-lime' : 'text-rip'
                        }`}>{tx.amount}</span>
                      </div>
                      <p className="text-[10px] text-muted">{tx.from} → {tx.to}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </span>
                      <div className={`text-[9px] ${tx.status === 'confirmed' ? 'text-lime' : 'text-gold'}`}>
                        {tx.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
