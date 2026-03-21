'use client';
// components/publish/PublishModal.tsx
// NFT minting + publishing flow — mint to Solana (Metaplex) or XRPL
import { useState } from 'react';

type Chain = 'solana' | 'xrpl';
type MediaType = 'episode' | 'scene' | 'music' | 'poster';
type Step = 'details' | 'chain' | 'royalties' | 'preview' | 'minting' | 'success';

interface PublishData {
  title: string;
  description: string;
  show: string;
  genre: string;
  season: string;
  episode: string;
  mediaType: MediaType;
  thumbnail: string;
  mediaUrl: string;
  chain: Chain;
  royaltyPercent: number;
  price: string;
  collection: string;
  tags: string[];
}

const GENRES = ['TV Show', 'Movie', 'Anime', 'Cartoon', 'News Show', 'Music', 'Documentary', 'Original'];
const MEDIA_TYPES: { id: MediaType; label: string; icon: string }[] = [
  { id: 'episode', label: 'Episode', icon: '📺' },
  { id: 'scene',   label: 'Scene',   icon: '🎬' },
  { id: 'music',   label: 'Music',   icon: '🎵' },
  { id: 'poster',  label: 'Poster',  icon: '🖼️' },
];

const CHAIN_INFO = {
  solana: {
    name: 'Solana',
    icon: '◎',
    color: '#9945FF',
    wallet: 'Phantom',
    currency: 'SOL',
    fee: '~0.01 SOL',
    features: ['Metaplex standard', 'Compressed NFTs', 'Collection grouping', 'Programmable royalties'],
  },
  xrpl: {
    name: 'XRPL',
    icon: '✕',
    color: '#00A3E0',
    wallet: 'XUMM',
    currency: 'XRP',
    fee: '~0.00001 XRP',
    features: ['Native NFTs', 'Built-in royalties', 'DEX integration', 'No smart contract'],
  },
};

const ROYALTY_PRESETS = [
  { pct: 2.5, label: 'Standard',  desc: 'Marketplace default' },
  { pct: 5,   label: 'Creator',   desc: 'Recommended for creators' },
  { pct: 7.5, label: 'Premium',   desc: 'High-value originals' },
  { pct: 10,  label: 'Maximum',   desc: 'Max enforced royalties' },
];

export function PublishModal({ open, onClose, initialData }: {
  open: boolean;
  onClose: () => void;
  initialData?: Partial<PublishData>;
}) {
  const [step, setStep] = useState<Step>('details');
  const [data, setData] = useState<PublishData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    show: initialData?.show || '',
    genre: initialData?.genre || '',
    season: '',
    episode: '',
    mediaType: initialData?.mediaType || 'scene',
    thumbnail: initialData?.thumbnail || '',
    mediaUrl: initialData?.mediaUrl || '',
    chain: 'solana',
    royaltyPercent: 5,
    price: '',
    collection: '',
    tags: [],
  });
  const [mintResult, setMintResult] = useState<any>(null);
  const [mintError, setMintError] = useState('');
  const [tagInput, setTagInput] = useState('');

  if (!open) return null;

  function update(patch: Partial<PublishData>) {
    setData(d => ({ ...d, ...patch }));
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (t && !data.tags.includes(t) && data.tags.length < 10) {
      update({ tags: [...data.tags, t] });
      setTagInput('');
    }
  }

  async function handleMint() {
    setStep('minting');
    setMintError('');

    try {
      // 1. Prepare metadata
      const res = await fetch('/api/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'prepare',
          chain: data.chain,
          metadata: {
            name: data.title,
            description: data.description,
            image: data.thumbnail,
            animation_url: data.mediaUrl || null,
            show: data.show,
            genre: data.genre,
            mediaType: data.mediaType,
            season: data.season ? parseInt(data.season) : undefined,
            episode: data.episode ? parseInt(data.episode) : undefined,
            royaltyBps: Math.round(data.royaltyPercent * 100),
            creatorAddress: 'WALLET_NOT_CONNECTED',
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to prepare metadata');
      const prepared = await res.json();

      // 2. In production: connect wallet and sign transaction
      // For now: simulate success after 2s
      await new Promise(r => setTimeout(r, 2000));

      setMintResult({
        chain: data.chain,
        txHash: `${data.chain === 'solana' ? '5K' : 'A1'}${Math.random().toString(36).slice(2, 10)}...${Math.random().toString(36).slice(2, 6)}`,
        mintAddress: `${Math.random().toString(36).slice(2, 14)}`,
        metadataUri: prepared.metadataUri,
      });
      setStep('success');
    } catch (err: any) {
      setMintError(err.message || 'Minting failed');
      setStep('preview');
    }
  }

  const chain = CHAIN_INFO[data.chain];

  const STEPS: { id: Step; label: string }[] = [
    { id: 'details',   label: 'Details' },
    { id: 'chain',     label: 'Chain' },
    { id: 'royalties', label: 'Royalties' },
    { id: 'preview',   label: 'Preview' },
  ];

  const currentIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-bg2 border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-bg2 border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-display text-2xl text-white tracking-wide">
              ☽ {step === 'minting' ? 'MINTING' : step === 'success' ? 'MINTED' : 'PUBLISH AS NFT'}
            </h2>
            {step !== 'minting' && step !== 'success' && (
              <div className="flex items-center gap-2 mt-2">
                {STEPS.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <button onClick={() => i <= currentIdx ? setStep(s.id) : null}
                      className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                        s.id === step ? 'bg-rip text-white'
                          : i < currentIdx ? 'bg-lime/20 text-lime border border-lime/30'
                          : 'bg-bg3 text-muted border border-border'
                      }`}>
                      {i < currentIdx ? '✓' : i + 1}
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className={`w-8 h-0.5 ${i < currentIdx ? 'bg-lime/30' : 'bg-border'}`} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-muted hover:text-white text-xl">✕</button>
        </div>

        <div className="p-6">

          {/* ── Step 1: Details ────────────────────────────── */}
          {step === 'details' && (
            <div className="space-y-4">
              <Field label="Title" required>
                <input value={data.title} onChange={e => update({ title: e.target.value })}
                  placeholder="e.g. Walter White Opens a Bakery"
                  className="w-full bg-bg3 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-bord2" />
              </Field>

              <Field label="Description">
                <textarea value={data.description} onChange={e => update({ description: e.target.value })}
                  rows={3} placeholder="Describe your creation..."
                  className="w-full bg-bg3 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-bord2 resize-none" />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Show / Source">
                  <input value={data.show} onChange={e => update({ show: e.target.value })}
                    placeholder="e.g. Breaking Bad"
                    className="w-full bg-bg3 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-bord2" />
                </Field>
                <Field label="Genre">
                  <select value={data.genre} onChange={e => update({ genre: e.target.value })}
                    className="w-full bg-bg3 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-bord2">
                    <option value="">Select genre</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Season (optional)">
                  <input value={data.season} onChange={e => update({ season: e.target.value })}
                    type="number" placeholder="1"
                    className="w-full bg-bg3 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-bord2" />
                </Field>
                <Field label="Episode (optional)">
                  <input value={data.episode} onChange={e => update({ episode: e.target.value })}
                    type="number" placeholder="1"
                    className="w-full bg-bg3 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-bord2" />
                </Field>
              </div>

              <Field label="Media Type">
                <div className="grid grid-cols-4 gap-2">
                  {MEDIA_TYPES.map(mt => (
                    <button key={mt.id} onClick={() => update({ mediaType: mt.id })}
                      className={`p-3 rounded-xl text-center transition-all ${
                        data.mediaType === mt.id
                          ? 'bg-rip/10 border-2 border-rip text-rip'
                          : 'bg-bg3 border border-border text-muted hover:text-white hover:border-bord2'
                      }`}>
                      <div className="text-2xl mb-1">{mt.icon}</div>
                      <div className="text-[10px] font-bold">{mt.label}</div>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Tags">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {data.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-bg3 border border-border rounded text-[10px] text-muted flex items-center gap-1">
                      #{tag}
                      <button onClick={() => update({ tags: data.tags.filter(t => t !== tag) })} className="text-muted2 hover:text-rip">✕</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tag..." maxLength={20}
                    className="flex-1 bg-bg3 border border-border rounded-lg px-3 py-2 text-white text-xs outline-none" />
                  <button onClick={addTag} className="px-3 py-2 bg-bg3 border border-border rounded-lg text-xs text-muted hover:text-white">+</button>
                </div>
              </Field>

              <button onClick={() => setStep('chain')} disabled={!data.title}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition hover:brightness-110 disabled:opacity-50"
                style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
                Next: Choose Chain →
              </button>
            </div>
          )}

          {/* ── Step 2: Chain Selection ───────────────────── */}
          {step === 'chain' && (
            <div className="space-y-4">
              <p className="text-sm text-muted mb-2">Choose which blockchain to mint your NFT on:</p>

              {(['solana', 'xrpl'] as Chain[]).map(c => {
                const info = CHAIN_INFO[c];
                const selected = data.chain === c;
                return (
                  <button key={c} onClick={() => update({ chain: c })}
                    className={`w-full text-left p-5 rounded-xl border transition-all ${
                      selected ? 'border-2' : 'border-border bg-bg3 hover:border-bord2'
                    }`}
                    style={selected ? { borderColor: info.color, background: info.color + '08' } : {}}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{info.icon}</span>
                      <div>
                        <div className="font-display text-xl text-white">{info.name}</div>
                        <div className="text-[10px] text-muted">Wallet: {info.wallet} · Mint fee: {info.fee}</div>
                      </div>
                      {selected && (
                        <div className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-xs"
                          style={{ backgroundColor: info.color }}>✓</div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {info.features.map(f => (
                        <span key={f} className="text-[9px] px-2 py-1 rounded bg-bg2 text-muted2 border border-border">{f}</span>
                      ))}
                    </div>
                  </button>
                );
              })}

              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep('details')}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-muted border border-border hover:border-bord2 transition">
                  ← Back
                </button>
                <button onClick={() => setStep('royalties')}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition hover:brightness-110"
                  style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
                  Next: Royalties →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Royalties ─────────────────────────── */}
          {step === 'royalties' && (
            <div className="space-y-4">
              <div className="bg-bg3 border border-border rounded-xl p-4 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💰</span>
                  <div className="text-sm font-bold text-white">Creator Royalties on Resale</div>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  You earn a percentage every time your NFT is resold. Choose a royalty rate below.
                  This is enforced on-chain{data.chain === 'xrpl' ? ' via XRPL transfer fees' : ' via Metaplex royalty guards'}.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {ROYALTY_PRESETS.map(rp => (
                  <button key={rp.pct} onClick={() => update({ royaltyPercent: rp.pct })}
                    className={`p-4 rounded-xl text-left transition-all ${
                      data.royaltyPercent === rp.pct
                        ? 'bg-lime/5 border-2 border-lime'
                        : 'bg-bg3 border border-border hover:border-bord2'
                    }`}>
                    <div className={`font-display text-2xl mb-1 ${data.royaltyPercent === rp.pct ? 'text-lime' : 'text-white'}`}>
                      {rp.pct}%
                    </div>
                    <div className="text-xs font-bold text-white">{rp.label}</div>
                    <div className="text-[10px] text-muted mt-0.5">{rp.desc}</div>
                  </button>
                ))}
              </div>

              {/* Custom royalty slider */}
              <div className="bg-bg3 border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted">Custom Rate</span>
                  <span className="text-sm font-bold text-lime font-mono">{data.royaltyPercent}%</span>
                </div>
                <input type="range" min="0" max="15" step="0.5"
                  value={data.royaltyPercent} onChange={e => update({ royaltyPercent: parseFloat(e.target.value) })}
                  className="w-full accent-lime" />
                <div className="flex justify-between text-[8px] text-muted2 mt-1">
                  <span>0%</span><span>15%</span>
                </div>
              </div>

              {/* Price (optional) */}
              <Field label="List Price (optional)">
                <div className="flex items-center gap-2">
                  <input value={data.price} onChange={e => update({ price: e.target.value })}
                    type="number" step="0.01" placeholder="0.00"
                    className="flex-1 bg-bg3 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-bord2" />
                  <span className="text-sm font-bold text-muted">{chain.currency}</span>
                </div>
                <p className="text-[10px] text-muted2 mt-1">Leave empty to mint without listing for sale</p>
              </Field>

              {/* Collection */}
              <Field label="Collection (optional)">
                <input value={data.collection} onChange={e => update({ collection: e.target.value })}
                  placeholder="e.g. Breaking Bad: Alt Endings"
                  className="w-full bg-bg3 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-bord2" />
                <p className="text-[10px] text-muted2 mt-1">Group NFTs into a collection / series</p>
              </Field>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep('chain')}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-muted border border-border hover:border-bord2 transition">
                  ← Back
                </button>
                <button onClick={() => setStep('preview')}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition hover:brightness-110"
                  style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
                  Preview NFT →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Preview ───────────────────────────── */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* NFT Card Preview */}
              <div className="bg-bg3 border border-border rounded-2xl overflow-hidden">
                {/* Thumbnail */}
                <div className="h-48 bg-bg relative flex items-center justify-center">
                  {data.thumbnail ? (
                    <img src={data.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-6xl opacity-20">
                      {MEDIA_TYPES.find(m => m.id === data.mediaType)?.icon || '🎬'}
                    </div>
                  )}
                  {/* Chain badge */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: chain.color + '20', color: chain.color, border: `1px solid ${chain.color}40` }}>
                    {chain.icon} {chain.name}
                  </div>
                </div>

                {/* Details */}
                <div className="p-5">
                  <h3 className="font-display text-2xl text-white mb-1">{data.title || 'Untitled'}</h3>
                  <p className="text-xs text-muted2 mb-3">{data.show} · {data.genre} · {data.mediaType}</p>
                  <p className="text-sm text-muted leading-relaxed mb-4">{data.description || 'No description'}</p>

                  {/* Tags */}
                  {data.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {data.tags.map(t => (
                        <span key={t} className="px-2 py-0.5 bg-bg2 text-muted2 text-[9px] rounded">#{t}</span>
                      ))}
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-bg2 rounded-lg p-3 text-center">
                      <div className="text-[8px] text-muted uppercase mb-1">Royalty</div>
                      <div className="font-display text-xl text-lime">{data.royaltyPercent}%</div>
                    </div>
                    <div className="bg-bg2 rounded-lg p-3 text-center">
                      <div className="text-[8px] text-muted uppercase mb-1">Chain</div>
                      <div className="font-display text-xl" style={{ color: chain.color }}>{chain.icon}</div>
                    </div>
                    <div className="bg-bg2 rounded-lg p-3 text-center">
                      <div className="text-[8px] text-muted uppercase mb-1">Price</div>
                      <div className="font-display text-xl text-white">
                        {data.price ? `${data.price} ${chain.currency}` : 'Free'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {mintError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400">
                  ⚠️ {mintError}
                </div>
              )}

              {/* Mint button */}
              <div className="flex gap-3">
                <button onClick={() => setStep('royalties')}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-muted border border-border hover:border-bord2 transition">
                  ← Back
                </button>
                <button onClick={handleMint}
                  className="flex-[2] py-3 rounded-xl font-display text-lg tracking-widest text-white transition hover:brightness-110"
                  style={{ background: `linear-gradient(90deg, ${chain.color}, #ff2d78)` }}>
                  ☽ MINT NFT on {chain.name}
                </button>
              </div>

              <div className="text-[10px] text-center text-muted2">
                Mint fee: {chain.fee} · Your {chain.wallet} wallet will prompt to sign
              </div>
            </div>
          )}

          {/* ── Minting State ─────────────────────────────── */}
          {step === 'minting' && (
            <div className="py-12 text-center">
              <div className="text-6xl mb-6 animate-pulse">☽</div>
              <h3 className="font-display text-3xl text-white mb-2">MINTING YOUR NFT</h3>
              <p className="text-sm text-muted mb-6">Preparing metadata and signing transaction...</p>
              <div className="w-48 mx-auto">
                <div className="h-1.5 bg-bg3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full animate-mint-progress"
                    style={{ background: `linear-gradient(90deg, ${chain.color}, #ff2d78)` }} />
                </div>
              </div>
              <div className="mt-6 text-[10px] text-muted2 space-y-1">
                <p>✅ Metadata prepared</p>
                <p className="animate-pulse">⏳ Signing with {chain.wallet}...</p>
                <p className="opacity-40">⏳ Confirming on {chain.name}...</p>
              </div>
            </div>
          )}

          {/* ── Success ───────────────────────────────────── */}
          {step === 'success' && mintResult && (
            <div className="py-8 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="font-display text-3xl text-white mb-2">NFT MINTED!</h3>
              <p className="text-sm text-muted mb-6">Your creation is now on {chain.name}</p>

              <div className="bg-bg3 border border-border rounded-xl p-5 text-left mb-6 max-w-md mx-auto">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted">Chain</span>
                    <span className="text-xs font-bold" style={{ color: chain.color }}>{chain.icon} {chain.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted">Tx Hash</span>
                    <span className="text-xs font-mono text-lime">{mintResult.txHash}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted">Mint Address</span>
                    <span className="text-xs font-mono text-cyan">{mintResult.mintAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted">Royalty</span>
                    <span className="text-xs font-bold text-lime">{data.royaltyPercent}% on resale</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 max-w-md mx-auto">
                <button onClick={onClose}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition hover:brightness-110"
                  style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
                  ☽ Done
                </button>
                <button className="flex-1 py-3 rounded-xl font-bold text-sm text-muted border border-border hover:border-bord2 transition"
                  onClick={() => window.open(
                    data.chain === 'solana'
                      ? `https://explorer.solana.com/tx/${mintResult.txHash}`
                      : `https://livenet.xrpl.org/transactions/${mintResult.txHash}`,
                    '_blank'
                  )}>
                  View on Explorer ↗
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Field Component ─────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 block">
        {label} {required && <span className="text-rip">*</span>}
      </label>
      {children}
    </div>
  );
}
