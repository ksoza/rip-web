'use client';
// components/publish/MintOnPublish.tsx
// Real on-chain NFT minting via Metaplex Token Metadata + Phantom wallet
// Uses Umi + mpl-token-metadata for genuine Solana NFT creation

import { useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { useWallet } from '@/lib/solana/wallet-provider';
import { mintNFT, type MintResult } from '@/lib/solana/metaplex-mint';

// ── $RiP Token ──────────────────────────────────────────────────
const RIP_TOKEN_MINT = 'CUvzcPdNoBHww1keQW4Vd21P5ZXJ5enZL7ULphS2pump';

// ── Types ───────────────────────────────────────────────────────
interface MintOnPublishProps {
  user: User;
  creation: {
    id: string;
    title: string;
    description: string;
    thumbnail?: string;
    videoUrl?: string;
    genre?: string;
    showTitle?: string;
    season?: string;
    episode?: string;
  };
  onMintComplete: (result: MintResult) => void;
  onSkip: () => void;
}

type RoyaltyPreset = 'standard' | 'premium' | 'generous' | 'custom';

// ── Royalty Presets ──────────────────────────────────────────────
const ROYALTY_PRESETS: Record<RoyaltyPreset, { label: string; bps: number; desc: string }> = {
  standard:  { label: '5%',   bps: 500,   desc: 'Standard — 5% on secondary sales' },
  premium:   { label: '7.5%', bps: 750,   desc: 'Premium — 7.5% for higher-value collections' },
  generous:  { label: '10%',  bps: 1000,  desc: 'Generous — 10% for maximum creator revenue' },
  custom:    { label: 'Custom', bps: 500,  desc: 'Set your own royalty percentage' },
};

// ── Main Component ──────────────────────────────────────────────
export function MintOnPublish({ user, creation, onMintComplete, onSkip }: MintOnPublishProps) {
  const wallet = useWallet();

  // Config
  const [autoMint, setAutoMint] = useState(true);
  const [royaltyPreset, setRoyaltyPreset] = useState<RoyaltyPreset>('standard');
  const [customRoyalty, setCustomRoyalty] = useState('5');
  const [maxEditions, setMaxEditions] = useState('1');
  const [editionType, setEditionType] = useState<'unique' | 'limited' | 'open'>('unique');
  const [includeVideo, setIncludeVideo] = useState(true);

  // State
  const [minting, setMinting] = useState(false);
  const [step, setStep] = useState<'config' | 'uploading' | 'signing' | 'confirming' | 'done'>('config');
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Computed royalty
  const royaltyBps = royaltyPreset === 'custom'
    ? Math.min(5000, Math.max(0, Math.round(parseFloat(customRoyalty || '5') * 100)))
    : ROYALTY_PRESETS[royaltyPreset].bps;

  // Edition count
  const editions = editionType === 'unique' ? 1 : editionType === 'open' ? 0 : parseInt(maxEditions) || 1;

  // ── Real Mint Flow via Metaplex ───────────────────────────────
  const handleMint = useCallback(async () => {
    if (!wallet.connected || !wallet.publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    setMinting(true);
    setError(null);

    try {
      setStep('uploading');

      const result = await mintNFT({
        title: creation.title,
        description: creation.description,
        image: creation.thumbnail || '',
        animationUrl: includeVideo ? creation.videoUrl : undefined,
        show: creation.showTitle || 'Original',
        genre: creation.genre || 'Uncategorized',
        mediaType: creation.videoUrl ? 'video' : 'image',
        royaltyBps,
        creatorAddress: wallet.publicKey,
        userId: user.id,
        creationId: creation.id,
        maxSupply: editions,
      });

      if (result.success) {
        setStep('done');
        setMintResult(result);
        onMintComplete(result);
      } else {
        throw new Error(result.error || 'Minting failed');
      }
    } catch (err: any) {
      console.error('Mint failed:', err);
      const errMsg = err.message || 'Minting failed';
      setError(errMsg);
      setStep('config');
      setMintResult({ success: false, error: errMsg });
    }

    setMinting(false);
  }, [wallet, creation, royaltyBps, editions, includeVideo, user.id, onMintComplete]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Auto-mint toggle */}
      <div className="flex items-center justify-between bg-bg2 border border-border rounded-xl p-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            💎 Mint as NFT
          </h3>
          <p className="text-[10px] text-muted">Turn your creation into a real on-chain Solana NFT (Metaplex standard)</p>
        </div>
        <button onClick={() => setAutoMint(!autoMint)}
          className={`w-12 h-6 rounded-full transition-colors relative ${
            autoMint ? 'bg-lime' : 'bg-bg3'
          }`}>
          <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
            autoMint ? 'left-6' : 'left-0.5'
          }`} />
        </button>
      </div>

      {!autoMint ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted mb-4">NFT minting is off — your creation will publish without minting</p>
          <button onClick={onSkip}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-rip text-white hover:brightness-110 transition">
            Publish Without NFT →
          </button>
        </div>
      ) : step === 'done' && mintResult?.success ? (
        /* ── Success ── */
        <div className="text-center py-6">
          <div className="text-6xl mb-3">✅</div>
          <h3 className="font-display text-2xl text-white mb-2">Minted on Solana!</h3>
          <p className="text-sm text-muted mb-4">Your NFT is live on-chain via Metaplex</p>
          <div className="bg-bg2 border border-lime/30 rounded-xl p-4 max-w-sm mx-auto mb-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted">Mint Address</span>
              <a href={mintResult.explorerUrl} target="_blank" rel="noopener noreferrer"
                className="text-cyan font-mono hover:underline">
                {mintResult.mintAddress?.slice(0, 8)}...{mintResult.mintAddress?.slice(-4)} ↗
              </a>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Chain</span>
              <span className="text-white">◎ Solana (Metaplex)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Royalties</span>
              <span className="text-lime">{(royaltyBps / 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Metadata</span>
              <a href={mintResult.metadataUri} target="_blank" rel="noopener noreferrer"
                className="text-cyan text-[10px] hover:underline">
                View JSON ↗
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* ── Config / In Progress ── */
        <>
          {/* Edition type */}
          <div>
            <label className="text-[10px] text-muted uppercase mb-2 block">Edition Type</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'unique', label: '1/1', desc: 'One-of-a-kind', icon: '👑' },
                { id: 'limited', label: 'Limited', desc: 'Set max supply', icon: '🔢' },
                { id: 'open', label: 'Open', desc: 'Unlimited mints', icon: '♾️' },
              ] as { id: typeof editionType; label: string; desc: string; icon: string }[]).map(e => (
                <button key={e.id} onClick={() => setEditionType(e.id)}
                  className={`p-3 rounded-xl text-center transition ${
                    editionType === e.id
                      ? 'bg-rip/10 border border-rip'
                      : 'bg-bg2 border border-border hover:border-rip/30'
                  }`}>
                  <div className="text-lg mb-1">{e.icon}</div>
                  <p className="text-xs font-bold text-white">{e.label}</p>
                  <p className="text-[8px] text-muted">{e.desc}</p>
                </button>
              ))}
            </div>
            {editionType === 'limited' && (
              <input type="number" min="2" max="10000" value={maxEditions}
                onChange={e => setMaxEditions(e.target.value)}
                placeholder="Max editions..."
                className="mt-2 w-full bg-bg2 border border-border rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-rip" />
            )}
          </div>

          {/* Royalty presets */}
          <div>
            <label className="text-[10px] text-muted uppercase mb-2 block">Creator Royalties</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(ROYALTY_PRESETS) as [RoyaltyPreset, typeof ROYALTY_PRESETS[RoyaltyPreset]][]).map(([key, preset]) => (
                <button key={key} onClick={() => setRoyaltyPreset(key)}
                  className={`p-3 rounded-xl text-left transition ${
                    royaltyPreset === key
                      ? 'bg-lime/10 border border-lime'
                      : 'bg-bg2 border border-border hover:border-lime/30'
                  }`}>
                  <p className="text-sm font-bold text-white">{preset.label}</p>
                  <p className="text-[8px] text-muted">{preset.desc}</p>
                </button>
              ))}
            </div>
            {royaltyPreset === 'custom' && (
              <div className="mt-2 flex items-center gap-2">
                <input type="number" min="0" max="50" step="0.5" value={customRoyalty}
                  onChange={e => setCustomRoyalty(e.target.value)}
                  className="w-20 bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-lime" />
                <span className="text-xs text-muted">%</span>
              </div>
            )}
          </div>

          {/* Include video toggle */}
          {creation.videoUrl && (
            <div className="flex items-center justify-between bg-bg2 border border-border rounded-xl p-3">
              <div>
                <p className="text-xs font-bold text-white">Include Video</p>
                <p className="text-[9px] text-muted">Attach video as animation_url in NFT metadata</p>
              </div>
              <button onClick={() => setIncludeVideo(!includeVideo)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  includeVideo ? 'bg-cyan' : 'bg-bg3'
                }`}>
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${
                  includeVideo ? 'left-5' : 'left-0.5'
                }`} />
              </button>
            </div>
          )}

          {/* Summary */}
          <div className="bg-bg2 border border-border rounded-xl p-4 space-y-2">
            <p className="text-[9px] text-muted uppercase tracking-widest mb-1">Mint Summary</p>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Title</span>
              <span className="text-white font-bold truncate max-w-[200px]">{creation.title}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Standard</span>
              <span className="text-white">◎ Metaplex Token Metadata</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Editions</span>
              <span className="text-white">{editionType === 'open' ? 'Unlimited' : editions}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Royalties</span>
              <span className="text-lime">{(royaltyBps / 100).toFixed(1)}% on secondary sales</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Revenue Split</span>
              <span className="text-muted">85% creator / 15% platform</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Metadata Storage</span>
              <span className="text-white">AWS S3 (permanent)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Mint Cost</span>
              <span className="text-white">~0.015 SOL (rent + tx fees)</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          {!wallet.connected ? (
            <button onClick={wallet.connect}
              className="w-full py-3 rounded-xl text-sm font-bold transition"
              style={{ background: 'linear-gradient(135deg, #9945FF, #14F195)' }}>
              ◎ Connect Phantom to Mint
            </button>
          ) : (
            <div className="space-y-2">
              <button onClick={handleMint}
                disabled={minting}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-black hover:brightness-110 transition disabled:opacity-50"
                style={{ background: minting
                  ? '#666'
                  : 'linear-gradient(90deg, #8aff00, #14F195)',
                }}>
                {step === 'uploading'   ? '📋 Uploading metadata to S3...' :
                 step === 'signing'     ? '✍️ Sign in Phantom...' :
                 step === 'confirming'  ? '⏳ Confirming on-chain...' :
                 '💎 Mint NFT on Solana'}
              </button>
              <button onClick={onSkip}
                className="w-full py-2.5 rounded-xl text-xs text-muted hover:text-white transition border border-border hover:border-rip/30">
                Skip — Publish Without NFT
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
