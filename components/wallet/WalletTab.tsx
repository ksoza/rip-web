// components/wallet/WalletTab.tsx
// Wallet tab — connect Solana/XRPL wallet, view NFTs, manage earnings
'use client';
import { useState } from 'react';

// ── Types ───────────────────────────────────────────────────────
type WalletChain = 'solana' | 'xrpl';
type WalletView = 'overview' | 'nfts' | 'earnings' | 'activity';

interface NFT {
  id: string;
  name: string;
  image?: string;
  collection: string;
  chain: WalletChain;
  floorPrice: string;
  mintAddress: string;
}

interface Transaction {
  id: string;
  type: 'mint' | 'sale' | 'royalty' | 'tip' | 'subscription';
  amount: string;
  currency: string;
  chain: WalletChain;
  from?: string;
  to?: string;
  timestamp: string;
  status: 'confirmed' | 'pending';
}

// ── Sample Data ─────────────────────────────────────────────────
const SAMPLE_NFTS: NFT[] = [
  { id: 'n1', name: 'Breaking Bread S1E1', collection: 'Breaking Bread', chain: 'solana', floorPrice: '0.5 SOL', mintAddress: '7nYB...4kPq' },
  { id: 'n2', name: 'Goku vs Saitama #001', collection: 'Anime Crossover', chain: 'solana', floorPrice: '1.2 SOL', mintAddress: '3mKL...9vRt' },
  { id: 'n3', name: 'RiP Genesis Pass', collection: 'RiP Passes', chain: 'xrpl', floorPrice: '50 XRP', mintAddress: 'rHb9...3eDf' },
];

const SAMPLE_TXS: Transaction[] = [
  { id: 't1', type: 'sale', amount: '0.5', currency: 'SOL', chain: 'solana', from: 'buyer123', timestamp: '2026-03-20T10:00:00Z', status: 'confirmed' },
  { id: 't2', type: 'royalty', amount: '0.025', currency: 'SOL', chain: 'solana', from: 'resale', timestamp: '2026-03-19T15:00:00Z', status: 'confirmed' },
  { id: 't3', type: 'tip', amount: '25', currency: 'XRP', chain: 'xrpl', from: 'fan_x', timestamp: '2026-03-18T20:00:00Z', status: 'confirmed' },
  { id: 't4', type: 'subscription', amount: '$5.00', currency: 'USD', chain: 'solana', timestamp: '2026-03-17T12:00:00Z', status: 'confirmed' },
];

// ── Component ───────────────────────────────────────────────────
export function WalletTab() {
  const [connected, setConnected] = useState(false);
  const [chain, setChain] = useState<WalletChain>('solana');
  const [view, setView] = useState<WalletView>('overview');
  const [walletAddress] = useState('DbnD8vxb...oq2xD5Nj');

  const VIEWS: { id: WalletView; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'nfts',     label: 'My NFTs',  icon: '💎' },
    { id: 'earnings', label: 'Earnings', icon: '💰' },
    { id: 'activity', label: 'Activity', icon: '📋' },
  ];

  if (!connected) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="text-6xl mb-6 opacity-40">💎</div>
        <h2 className="font-display text-3xl text-white mb-2">Connect Wallet</h2>
        <p className="text-sm text-muted mb-8">Link your wallet to mint NFTs, earn royalties, and manage your on-chain assets.</p>

        {/* Chain selector */}
        <div className="flex gap-3 justify-center mb-6">
          {[
            { id: 'solana' as WalletChain, label: 'Solana', icon: '◎', color: '#9945FF' },
            { id: 'xrpl' as WalletChain,   label: 'XRPL',   icon: '✕', color: '#00A3E0' },
          ].map(c => (
            <button key={c.id} onClick={() => setChain(c.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border text-sm font-bold transition-all ${
                chain === c.id
                  ? 'text-white'
                  : 'bg-bg2 border-border text-muted hover:text-white'
              }`}
              style={chain === c.id ? { backgroundColor: `${c.color}20`, borderColor: `${c.color}40`, color: c.color } : {}}>
              <span>{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>

        {/* Connect buttons */}
        <div className="space-y-3">
          {chain === 'solana' ? (
            <>
              <button onClick={() => setConnected(true)}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition hover:brightness-110"
                style={{ background: 'linear-gradient(90deg, #9945FF, #14F195)' }}>
                🦊 Connect Phantom
              </button>
              <button onClick={() => setConnected(true)}
                className="w-full py-3 rounded-xl text-sm font-bold bg-bg2 border border-border text-muted hover:text-white transition">
                Connect Solflare
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setConnected(true)}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition hover:brightness-110"
                style={{ background: 'linear-gradient(90deg, #00A3E0, #00D4FF)' }}>
                💧 Connect Xaman (Xumm)
              </button>
              <button onClick={() => setConnected(true)}
                className="w-full py-3 rounded-xl text-sm font-bold bg-bg2 border border-border text-muted hover:text-white transition">
                Connect GemWallet
              </button>
            </>
          )}
        </div>

        <p className="text-[10px] text-muted2 mt-4">
          Your wallet connects locally. Private keys never leave your device.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Wallet header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: chain === 'solana' ? '#9945FF20' : '#00A3E020' }}>
            {chain === 'solana' ? '◎' : '✕'}
          </div>
          <div>
            <div className="text-sm font-bold text-white">{walletAddress}</div>
            <div className="text-[10px] text-muted">{chain === 'solana' ? 'Solana' : 'XRPL'} · Connected</div>
          </div>
        </div>
        <button onClick={() => setConnected(false)}
          className="px-3 py-1.5 rounded-lg text-[10px] bg-bg2 border border-border text-muted hover:text-rip hover:border-rip/30 transition">
          Disconnect
        </button>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              view === v.id ? 'border-rip text-rip' : 'border-transparent text-muted hover:text-white'
            }`}>
            <span>{v.icon}</span> {v.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {view === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Balance', value: chain === 'solana' ? '4.23 SOL' : '1,250 XRP', color: '#8aff00' },
              { label: 'NFTs Owned', value: SAMPLE_NFTS.filter(n => n.chain === chain).length.toString(), color: '#a855f7' },
              { label: 'Total Earned', value: chain === 'solana' ? '2.1 SOL' : '175 XRP', color: '#ffcc00' },
              { label: 'Pending', value: chain === 'solana' ? '0.05 SOL' : '0 XRP', color: '#ff2d78' },
            ].map(stat => (
              <div key={stat.label} className="bg-bg2 border border-border rounded-xl p-4 text-center">
                <div className="font-display text-xl" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[9px] text-muted uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Revenue split info */}
          <div className="bg-bg2 border border-border rounded-xl p-4">
            <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Revenue Split</h3>
            <div className="space-y-2">
              {[
                { label: 'Founder', pct: 13, color: '#ff2d78' },
                { label: 'Launch Fund', pct: 50, color: '#00d4ff' },
                { label: 'AI Costs', pct: 15, color: '#a855f7' },
                { label: 'Staking Pool', pct: 10, color: '#8aff00' },
                { label: 'Operations', pct: 7, color: '#ffcc00' },
                { label: 'Reserve', pct: 5, color: '#666' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted w-24">{item.label}</span>
                  <div className="flex-1 h-2 bg-bg3 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: item.color }}>{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NFTs */}
      {view === 'nfts' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SAMPLE_NFTS.map(nft => (
            <div key={nft.id} className="bg-bg2 border border-border rounded-xl overflow-hidden hover:border-bord2 transition cursor-pointer group">
              <div className="aspect-square bg-bg3 flex items-center justify-center relative">
                {nft.image ? (
                  <img src={nft.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl opacity-20">💎</span>
                )}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8px] font-bold"
                  style={{
                    backgroundColor: nft.chain === 'solana' ? '#9945FF20' : '#00A3E020',
                    color: nft.chain === 'solana' ? '#9945FF' : '#00A3E0',
                    border: `1px solid ${nft.chain === 'solana' ? '#9945FF40' : '#00A3E040'}`,
                  }}>
                  {nft.chain === 'solana' ? '◎' : '✕'} NFT
                </div>
              </div>
              <div className="p-3">
                <h4 className="text-sm font-bold text-white group-hover:text-rip transition">{nft.name}</h4>
                <p className="text-[10px] text-muted">{nft.collection}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-muted">Floor</span>
                  <span className="text-xs font-bold" style={{ color: nft.chain === 'solana' ? '#9945FF' : '#00A3E0' }}>
                    {nft.floorPrice}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {/* Mint new */}
          <div className="bg-bg2 border border-border border-dashed rounded-xl flex items-center justify-center aspect-square cursor-pointer hover:border-rip transition">
            <div className="text-center">
              <div className="text-3xl mb-2 opacity-40">+</div>
              <p className="text-xs text-muted">Mint New NFT</p>
            </div>
          </div>
        </div>
      )}

      {/* Earnings */}
      {view === 'earnings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Sales', amount: '1.8 SOL', count: 3 },
              { label: 'Royalties', amount: '0.25 SOL', count: 8 },
              { label: 'Tips', amount: '0.05 SOL + 25 XRP', count: 2 },
            ].map(e => (
              <div key={e.label} className="bg-bg2 border border-border rounded-xl p-4">
                <div className="text-xs text-muted uppercase mb-1">{e.label}</div>
                <div className="font-display text-lg text-lime">{e.amount}</div>
                <div className="text-[9px] text-muted">{e.count} transactions</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity */}
      {view === 'activity' && (
        <div className="space-y-2">
          {SAMPLE_TXS.map(tx => (
            <div key={tx.id} className="flex items-center gap-3 p-3 bg-bg2 border border-border rounded-xl">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                tx.type === 'sale' ? 'bg-lime/20' :
                tx.type === 'royalty' ? 'bg-purple/20' :
                tx.type === 'tip' ? 'bg-gold/20' : 'bg-cyan/20'
              }`}>
                {{ sale: '💰', royalty: '👑', tip: '🎁', subscription: '📋', mint: '💎' }[tx.type]}
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-white capitalize">{tx.type}</div>
                {tx.from && <div className="text-[10px] text-muted">from {tx.from}</div>}
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-lime">+{tx.amount} {tx.currency}</div>
                <div className="text-[9px] text-muted2">
                  {new Date(tx.timestamp).toLocaleDateString()}
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${tx.status === 'confirmed' ? 'bg-lime' : 'bg-gold animate-pulse'}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
