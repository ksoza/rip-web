'use client';
// components/wallet/WalletTab.tsx
// $RIP Token + Wallet Management — connect Solana/XRPL wallets, view balances
// Phase 1: Wired to /api/transactions, /api/staking, /api/nfts for real data
// NOTE: user is passed as prop from AppShell (same pattern as all other tabs)
import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';

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
  type: string;
  amount_usd: number | null;
  amount_sol: number | null;
  stripe_payment_id: string | null;
  solana_tx_sig: string | null;
  metadata: any;
  created_at: string;
}

interface StakingPosition {
  id: string;
  amount_sol: number;
  apy: number;
  staked_at: string;
  unlock_at: string;
  status: string;
  rewards_earned: number;
}

interface NFT {
  id: string;
  creation_id: string;
  mint_address: string;
  metadata_uri: string;
  edition_number: number;
  max_editions: number;
  royalty_bps: number;
  listed_price_sol: number | null;
  status: string;
  minted_at: string;
}

type WalletView = 'portfolio' | 'nfts' | 'staking' | 'history';

// ── Placeholder tokens until real wallet adapter connects ────────
const PLACEHOLDER_TOKENS: TokenBalance[] = [
  { symbol: '$RIP', name: 'Remix IP Token', balance: '—', value: '—', icon: '☽', change: 0 },
  { symbol: 'SOL', name: 'Solana', balance: '—', value: '—', icon: '◎', change: 0 },
  { symbol: 'USDC', name: 'USD Coin', balance: '—', value: '—', icon: '💲', change: 0 },
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

export function WalletTab({ user }: { user: User }) {
  const userId = user.id;

  const [view, setView] = useState<WalletView>('portfolio');
  const [wallet, setWallet] = useState<WalletState>({
    connected: false, chain: null, address: '', balance: '0', tokens: [],
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stakingPositions, setStakingPositions] = useState<StakingPosition[]>([]);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('');
  const [staking, setStaking] = useState(false);

  // ── Fetch real data from APIs ──────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch(`/api/transactions?userId=${userId}`);
      if (res.ok) setTransactions(await res.json());
    } catch (e) { console.error('Failed to fetch transactions', e); }
  }, [userId]);

  const fetchStaking = useCallback(async () => {
    try {
      const res = await fetch(`/api/staking?userId=${userId}`);
      if (res.ok) setStakingPositions(await res.json());
    } catch (e) { console.error('Failed to fetch staking', e); }
  }, [userId]);

  const fetchNFTs = useCallback(async () => {
    try {
      const res = await fetch(`/api/nfts?userId=${userId}`);
      if (res.ok) setNfts(await res.json());
    } catch (e) { console.error('Failed to fetch NFTs', e); }
  }, [userId]);

  // Fetch all on mount + when view changes
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTransactions(), fetchStaking(), fetchNFTs()])
      .finally(() => setLoading(false));
  }, [fetchTransactions, fetchStaking, fetchNFTs]);

  // ── Wallet connection (placeholder until Phantom adapter in Phase 2) ──
  const connectWallet = (chain: 'solana' | 'xrpl') => {
    // Phase 2: Use @solana/wallet-adapter-react here
    setWallet({
      connected: true,
      chain,
      address: chain === 'solana'
        ? 'DbnD8vxbNVrG9iL7oi83Zg8RGqxFLATGcW67oq2xD5Nj'
        : 'rN7n3473SoLGDGdrgWUVBBdUzmaTEhkr8p',
      balance: chain === 'solana' ? '— SOL' : '— XRP',
      tokens: PLACEHOLDER_TOKENS,
    });
  };

  const disconnectWallet = () => {
    setWallet({ connected: false, chain: null, address: '', balance: '0', tokens: [] });
  };

  // ── Staking action ──
  const handleStake = async () => {
    if (!stakeAmount) return;
    setStaking(true);
    try {
      const res = await fetch('/api/staking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amountSol: parseFloat(stakeAmount), lockDays: 30 }),
      });
      if (res.ok) {
        setStakeAmount('');
        await fetchStaking();
      }
    } catch (e) { console.error('Stake failed', e); }
    setStaking(false);
  };

  // ── Computed values ──
  const totalStaked = stakingPositions.filter(p => p.status === 'locked').reduce((sum, p) => sum + p.amount_sol, 0);
  const totalRewards = stakingPositions.reduce((sum, p) => sum + (p.rewards_earned || 0), 0);
  const avgApy = stakingPositions.length > 0
    ? stakingPositions.reduce((sum, p) => sum + p.apy, 0) / stakingPositions.length
    : 0;

  const VIEW_TABS: { id: WalletView; label: string; icon: string }[] = [
    { id: 'portfolio', label: 'Portfolio', icon: '💰' },
    { id: 'nfts', label: 'NFTs', icon: '💎' },
    { id: 'staking', label: 'Staking', icon: '🔒' },
    { id: 'history', label: 'History', icon: '📜' },
  ];

  // ── Helpers ──
  const txIcon = (type: string) =>
    type === 'subscription' ? '🛒' : type === 'nft_mint' ? '💎' : type === 'staking' ? '🔒' : type === 'reward' ? '🎁' : '💸';
  const txColor = (type: string) =>
    type === 'subscription' ? 'bg-gold/20' : type === 'nft_mint' ? 'bg-purple/20' : type === 'staking' ? 'bg-cyan/20' : 'bg-lime/20';
  const fmtAmount = (tx: Transaction) => {
    if (tx.amount_usd) return `$${tx.amount_usd.toFixed(2)}`;
    if (tx.amount_sol) return `${tx.amount_sol} SOL`;
    return '—';
  };

  return (
    <div className="min-h-screen bg-bg text-white p-4 pb-24">
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

            {/* Total Balance placeholder */}
            <div className="bg-bg2 border border-border rounded-2xl p-6 mb-4 text-center">
              <p className="text-[9px] text-muted uppercase tracking-widest mb-1">Total Portfolio</p>
              <h2 className="font-display text-4xl text-white">—</h2>
              <p className="text-xs text-muted mt-1">Connect Phantom wallet for real balances (Phase 2)</p>
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

            {/* ── PORTFOLIO VIEW ── */}
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
                    </div>
                  </div>
                ))}

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

            {/* ── NFTS VIEW — real data ── */}
            {view === 'nfts' && (
              <div>
                {nfts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4 opacity-30">💎</div>
                    <p className="text-sm text-muted mb-2">No NFTs minted yet</p>
                    <p className="text-xs text-muted2">Create content in the Studio, then publish as NFTs</p>
                    <button className="mt-4 px-4 py-2 bg-rip text-white text-xs font-bold rounded-xl">
                      Go to Studio →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nfts.map(nft => (
                      <div key={nft.id} className="flex items-center gap-3 bg-bg2 border border-border rounded-xl p-4">
                        <div className="w-12 h-12 rounded-xl bg-purple/20 flex items-center justify-center text-2xl">💎</div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white">NFT #{nft.edition_number || '—'}</p>
                          <p className="text-[10px] text-muted font-mono">{nft.mint_address.slice(0, 8)}...{nft.mint_address.slice(-4)}</p>
                          <p className="text-[10px] text-muted">
                            {nft.status === 'listed' && nft.listed_price_sol ? `Listed: ${nft.listed_price_sol} SOL` : nft.status}
                          </p>
                        </div>
                        <div className="text-right text-[10px] text-muted">
                          {new Date(nft.minted_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── STAKING VIEW — real data ── */}
            {view === 'staking' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-bg2 border border-border rounded-xl p-4 text-center">
                    <p className="text-[9px] text-muted uppercase">Staked</p>
                    <p className="font-display text-2xl text-lime">
                      {totalStaked > 0 ? `${totalStaked.toFixed(2)} SOL` : '0'}
                    </p>
                  </div>
                  <div className="bg-bg2 border border-border rounded-xl p-4 text-center">
                    <p className="text-[9px] text-muted uppercase">Avg APY</p>
                    <p className="font-display text-2xl text-gold">
                      {avgApy > 0 ? `${avgApy.toFixed(1)}%` : '—'}
                    </p>
                  </div>
                  <div className="bg-bg2 border border-border rounded-xl p-4 text-center">
                    <p className="text-[9px] text-muted uppercase">Rewards</p>
                    <p className="font-display text-2xl text-cyan">
                      {totalRewards > 0 ? `${totalRewards.toFixed(4)} SOL` : '0'}
                    </p>
                  </div>
                  <div className="bg-bg2 border border-border rounded-xl p-4 text-center">
                    <p className="text-[9px] text-muted uppercase">Positions</p>
                    <p className="font-display text-2xl text-muted">{stakingPositions.length}</p>
                  </div>
                </div>

                {/* Active positions */}
                {stakingPositions.filter(p => p.status === 'locked').map(pos => (
                  <div key={pos.id} className="bg-bg2 border border-lime/30 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-lime">{pos.amount_sol} SOL</span>
                      <span className="text-xs text-gold">{pos.apy}% APY</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted">
                      <span>Staked: {new Date(pos.staked_at).toLocaleDateString()}</span>
                      <span>Unlocks: {new Date(pos.unlock_at).toLocaleDateString()}</span>
                    </div>
                    {pos.rewards_earned > 0 && (
                      <p className="text-[10px] text-cyan mt-1">Earned: {pos.rewards_earned.toFixed(4)} SOL</p>
                    )}
                  </div>
                ))}

                {/* Stake form */}
                <div className="bg-bg2 border border-border rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-3">Stake $RIP / SOL</h3>
                  <p className="text-xs text-muted mb-4">
                    Stake your tokens to earn rewards. 10% of platform revenue is distributed to stakers.
                  </p>
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={stakeAmount}
                      onChange={e => setStakeAmount(e.target.value)}
                      placeholder="Amount to stake..."
                      className="flex-1 bg-bg3 border border-border rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-lime" />
                    <button onClick={() => setStakeAmount('1.0')}
                      className="px-3 py-2 bg-bg3 border border-border rounded-lg text-xs text-muted hover:text-white">
                      MAX
                    </button>
                  </div>
                  <button onClick={handleStake} disabled={!stakeAmount || staking}
                    className="w-full py-3 rounded-xl text-sm font-bold text-black bg-lime hover:brightness-110 transition disabled:opacity-50">
                    {staking ? 'Staking...' : '🔒 Stake'}
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

            {/* ── HISTORY VIEW — real transactions ── */}
            {view === 'history' && (
              <div className="space-y-2">
                {loading && <p className="text-center text-xs text-muted py-4">Loading...</p>}
                {!loading && transactions.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3 opacity-30">📜</div>
                    <p className="text-sm text-muted">No transactions yet</p>
                  </div>
                )}
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 bg-bg2 border border-border rounded-xl p-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${txColor(tx.type)}`}>
                      {txIcon(tx.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white capitalize">{tx.type.replace('_', ' ')}</span>
                        <span className="text-xs font-bold text-rip">{fmtAmount(tx)}</span>
                      </div>
                      {tx.stripe_payment_id && (
                        <p className="text-[10px] text-muted font-mono">Stripe: {tx.stripe_payment_id.slice(0, 12)}...</p>
                      )}
                      {tx.solana_tx_sig && (
                        <p className="text-[10px] text-muted font-mono">TX: {tx.solana_tx_sig.slice(0, 12)}...</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </span>
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
