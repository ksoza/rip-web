'use client';
// components/publish/PublishFlow.tsx
// Multi-step publish & mint flow for RiP creations
// Step 1: Details → Step 2: NFT Options → Step 3: Preview & Publish
import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowser } from '@/lib/supabase';
import type { Chain, NFTMediaType } from '@/lib/nft/types';
import { ROYALTY_PRESETS, CHAIN_CONFIG } from '@/lib/nft/mint';
import { mintNFT as executeMintNFT } from '@/lib/solana/metaplex-mint';
import { useWallet } from '@/lib/solana/wallet-provider';

// ── Types ───────────────────────────────────────────────────────
interface PublishFlowProps {
  user: User;
  onClose: () => void;
  initialData?: {
    title?: string;
    description?: string;
    thumbnail?: string;
    mediaUrl?: string;
    show?: string;
    genre?: string;
  };
}

type Step = 'details' | 'nft' | 'preview';

const GENRES = ['TV Show', 'Movie', 'Anime', 'Cartoon', 'News Show', 'Music Video', 'Short Film'];
const MEDIA_TYPES: { id: NFTMediaType; label: string; icon: string }[] = [
  { id: 'episode', label: 'Episode',    icon: '📺' },
  { id: 'scene',   label: 'Scene',      icon: '🎬' },
  { id: 'movie',   label: 'Full Movie', icon: '🎞️' },
  { id: 'music',   label: 'Music',      icon: '🎵' },
  { id: 'collection', label: 'Collection', icon: '📚' },
];

export function PublishFlow({ user, onClose, initialData }: PublishFlowProps) {
  const wallet = useWallet();
  const [step, setStep] = useState<Step>('details');
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [mintResult, setMintResult] = useState<{ mintAddress?: string; explorerUrl?: string } | null>(null);

  // ── Form state ────────────────────────────────────────────
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [show, setShow] = useState(initialData?.show || '');
  const [genre, setGenre] = useState(initialData?.genre || '');
  const [mediaType, setMediaType] = useState<NFTMediaType>('episode');
  const [tags, setTags] = useState('');
  const [thumbnail, setThumbnail] = useState(initialData?.thumbnail || '');
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);

  // ── NFT options ───────────────────────────────────────────
  const [mintNFT, setMintNFT] = useState(true);
  const [chain, setChain] = useState<Chain>('solana');
  const [royaltyPresetIdx, setRoyaltyPresetIdx] = useState(0);
  const [customRoyalty, setCustomRoyalty] = useState(5);
  const [listPrice, setListPrice] = useState('');
  const [collectionName, setCollectionName] = useState('');

  const royaltyBps = royaltyPresetIdx === 3
    ? Math.round(customRoyalty * 100)
    : ROYALTY_PRESETS[royaltyPresetIdx].bps;
  const royaltyPercent = royaltyBps / 100;

  const chainInfo = CHAIN_CONFIG[chain];

  // ── Steps ─────────────────────────────────────────────────
  const steps: { id: Step; label: string; num: number }[] = [
    { id: 'details', label: 'Details',  num: 1 },
    { id: 'nft',     label: 'NFT Mint', num: 2 },
    { id: 'preview', label: 'Publish',  num: 3 },
  ];

  const canProceedDetails = title.trim() && description.trim() && show.trim() && genre;
  const canPublish = canProceedDetails;

  // ── Publish Handler (real Supabase insert) ─────────────────
  const [publishError, setPublishError] = useState('');

  async function handlePublish() {
    setPublishing(true);
    setPublishError('');

    try {
      const supabase = createSupabaseBrowser();

      // Build tags string from comma-separated input
      const tagList = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .map(t => `#${t.replace(/^#/, '')}`)
        .join(' ');

      // Insert creation into Supabase
      const { data: creation, error } = await supabase
        .from('creations')
        .insert({
          user_id:    user.id,
          show_title: show,
          genre,
          type:       MEDIA_TYPES.find(mt => mt.id === mediaType)?.label || mediaType,
          title,
          logline:    description.slice(0, 200),
          content:    description,
          hashtags:   tagList,
          tools_used: ['RiP Studio'],
          is_public:  true,
        })
        .select()
        .single();

      if (error) {
        console.error('Publish error:', error);
        setPublishError(error.message || 'Failed to publish');
        setPublishing(false);
        return;
      }

      // If NFT minting is enabled and wallet is connected, mint
      if (mintNFT && wallet.connected && wallet.publicKey && creation) {
        try {
          const result = await executeMintNFT({
            title,
            description,
            image: thumbnail || creation.thumbnail || '',
            animationUrl: initialData?.mediaUrl,
            show,
            genre,
            mediaType,
            royaltyBps: royalty,
            creatorAddress: wallet.publicKey,
            userId: user.id,
            creationId: creation.id,
          });
          if (result.success) {
            setMintResult({ mintAddress: result.mintAddress, explorerUrl: result.explorerUrl });
          } else {
            console.warn('NFT mint warning:', result.error);
            // Don't fail the whole publish — creation is already saved
          }
        } catch (mintErr) {
          console.warn('NFT mint error (publish succeeded):', mintErr);
        }
      }

      // Small delay for UX feel
      await new Promise(r => setTimeout(r, 400));

      setPublished(true);
    } catch (err: any) {
      console.error('Publish exception:', err);
      setPublishError(err.message || 'Something went wrong');
    } finally {
      setPublishing(false);
    }
  }

  // ── Published Success ─────────────────────────────────────
  if (published) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur z-[100] flex items-center justify-center p-4">
        <div className="bg-bg2 border border-border rounded-2xl max-w-lg w-full p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="font-display text-3xl text-white mb-2">Published!</h2>
          <p className="text-muted text-sm mb-6">
            Your creation is live on the Discover feed
            {mintNFT && ` and minted as an NFT on ${chainInfo.name}`}
          </p>
          {mintNFT && (
            <div className="bg-bg3 border border-bord2 rounded-xl p-4 mb-6 text-left">
              <div className="text-[9px] text-muted uppercase tracking-widest mb-2">NFT Details</div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-xs text-muted">Chain</span>
                  <span className="text-xs font-bold" style={{ color: chainInfo.color }}>{chainInfo.icon} {chainInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted">Royalties</span>
                  <span className="text-xs font-bold text-lime">{royaltyPercent}%</span>
                </div>
                {listPrice && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted">List Price</span>
                    <span className="text-xs font-bold text-white">{listPrice} {chainInfo.currency}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-muted">Mint Fee</span>
                  <span className="text-xs text-muted2">{chainInfo.mintFee}</span>
                </div>
                {mintResult?.mintAddress && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted">Mint Address</span>
                    <span className="text-xs text-cyan font-mono">{mintResult.mintAddress.slice(0, 12)}...</span>
                  </div>
                )}
                {mintResult?.explorerUrl && (
                  <div className="mt-2">
                    <a href={mintResult.explorerUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-cyan hover:underline">View on Explorer ↗</a>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white border border-border hover:border-bord2 transition-all">
              Done
            </button>
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition hover:brightness-110"
              style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
              View on Discover
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur z-[100] flex items-center justify-center p-4">
      <div className="bg-bg border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-bg/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-display text-2xl text-white tracking-wide">☽ Publish</h2>
            <p className="text-xs text-muted">Share your creation with the world</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white text-xl transition">✕</button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <button onClick={() => setStep(s.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    step === s.id
                      ? 'bg-rip/10 border border-rip text-rip'
                      : 'text-muted hover:text-white'
                  }`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === s.id ? 'bg-rip text-white' : 'bg-bg3 text-muted'
                  }`}>{s.num}</span>
                  {s.label}
                </button>
                {i < steps.length - 1 && <div className="flex-1 h-px bg-border" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {/* ── STEP 1: Details ─────────────────────────────── */}
          {step === 'details' && (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Walter White Opens a Bakery"
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rip placeholder:text-muted2" />
              </div>

              {/* Description */}
              <div>
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">Description *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Describe your creation..."
                  rows={3}
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rip placeholder:text-muted2 resize-none" />
              </div>

              {/* Show / Genre row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">Show / IP *</label>
                  <input value={show} onChange={e => setShow(e.target.value)}
                    placeholder="e.g. Breaking Bad"
                    className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rip placeholder:text-muted2" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">Genre *</label>
                  <select value={genre} onChange={e => setGenre(e.target.value)}
                    className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rip">
                    <option value="">Select genre</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {/* Media Type */}
              <div>
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">Content Type</label>
                <div className="flex flex-wrap gap-2">
                  {MEDIA_TYPES.map(mt => (
                    <button key={mt.id} onClick={() => setMediaType(mt.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        mediaType === mt.id
                          ? 'bg-cyan/10 border border-cyan text-cyan'
                          : 'bg-bg2 border border-border text-muted hover:text-white'
                      }`}>
                      <span>{mt.icon}</span> {mt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Season / Episode (conditional) */}
              {(mediaType === 'episode' || mediaType === 'scene') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">Season</label>
                    <input type="number" value={season} onChange={e => setSeason(Number(e.target.value))} min={1}
                      className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rip" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">Episode</label>
                    <input type="number" value={episode} onChange={e => setEpisode(Number(e.target.value))} min={1}
                      className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rip" />
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">Tags</label>
                <input value={tags} onChange={e => setTags(e.target.value)}
                  placeholder="comedy, altending, crossover (comma separated)"
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rip placeholder:text-muted2" />
              </div>

              {/* Thumbnail */}
              <div>
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">Thumbnail URL</label>
                <input value={thumbnail} onChange={e => setThumbnail(e.target.value)}
                  placeholder="Paste image URL or generate one in Studio"
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rip placeholder:text-muted2" />
                {thumbnail && (
                  <div className="mt-2 h-32 rounded-lg overflow-hidden bg-bg3 border border-border">
                    <img src={thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Next button */}
              <button onClick={() => setStep('nft')}
                disabled={!canProceedDetails}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                  canProceedDetails
                    ? 'text-white hover:brightness-110'
                    : 'text-muted bg-bg3 border border-border cursor-not-allowed'
                }`}
                style={canProceedDetails ? { background: 'linear-gradient(90deg,#ff2d78,#a855f7)' } : {}}>
                Continue to NFT Options →
              </button>
            </div>
          )}

          {/* ── STEP 2: NFT Options ────────────────────────── */}
          {step === 'nft' && (
            <div className="space-y-5">
              {/* Mint toggle */}
              <div className="flex items-center gap-4 bg-bg2 border border-border rounded-xl p-4">
                <button onClick={() => setMintNFT(!mintNFT)}
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    mintNFT ? 'bg-rip' : 'bg-bg3 border border-bord2'
                  }`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                    mintNFT ? 'left-[26px]' : 'left-0.5'
                  }`} />
                </button>
                <div>
                  <div className="text-sm font-bold text-white">Mint as NFT</div>
                  <div className="text-xs text-muted">Turn your creation into a tradeable NFT with royalties on every resale</div>
                </div>
              </div>

              {mintNFT && (
                <>
                  {/* Chain Selection */}
                  <div>
                    <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-2">Select Blockchain</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['solana', 'xrpl'] as Chain[]).map(c => {
                        const info = CHAIN_CONFIG[c];
                        const selected = chain === c;
                        return (
                          <button key={c} onClick={() => setChain(c)}
                            className={`relative p-4 rounded-xl border text-left transition-all ${
                              selected ? 'border-2' : 'border-border hover:border-bord2'
                            }`}
                            style={selected ? { borderColor: info.color, background: info.color + '08' } : {}}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">{info.icon}</span>
                              <span className="font-display text-lg text-white">{info.name}</span>
                            </div>
                            <div className="text-[10px] text-muted mb-2">Wallet: {info.wallet}</div>
                            <div className="text-[10px] text-muted">Mint fee: {info.mintFee}</div>
                            <div className="mt-2 space-y-1">
                              {info.features.slice(0, 2).map(f => (
                                <div key={f} className="text-[9px] text-muted2">✓ {f}</div>
                              ))}
                            </div>
                            {selected && (
                              <div className="absolute top-3 right-3 w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white"
                                style={{ backgroundColor: info.color }}>✓</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Royalty Presets */}
                  <div>
                    <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-2">Royalties on Resale</label>
                    <div className="space-y-2">
                      {ROYALTY_PRESETS.map((preset, i) => (
                        <button key={i} onClick={() => setRoyaltyPresetIdx(i)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                            royaltyPresetIdx === i ? 'border-lime bg-lime/5' : 'border-border hover:border-bord2'
                          }`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            royaltyPresetIdx === i ? 'border-lime bg-lime' : 'border-bord2'
                          }`}>
                            {royaltyPresetIdx === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-white">{preset.label}</div>
                            <div className="text-[10px] text-muted">{preset.description}</div>
                          </div>
                          {preset.bps > 0 && (
                            <div className="text-sm font-bold text-lime">{preset.bps / 100}%</div>
                          )}
                        </button>
                      ))}
                    </div>
                    {royaltyPresetIdx === 3 && (
                      <div className="mt-2 flex items-center gap-3">
                        <input type="range" min={0} max={15} step={0.5} value={customRoyalty}
                          onChange={e => setCustomRoyalty(Number(e.target.value))}
                          className="flex-1 accent-lime" />
                        <span className="text-sm font-bold text-lime w-12 text-right">{customRoyalty}%</span>
                      </div>
                    )}
                  </div>

                  {/* List Price */}
                  <div>
                    <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">List Price (optional)</label>
                    <div className="flex gap-2">
                      <input value={listPrice} onChange={e => setListPrice(e.target.value)}
                        placeholder="0.00"
                        type="number" step="0.01" min="0"
                        className="flex-1 bg-bg2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rip placeholder:text-muted2" />
                      <div className="bg-bg3 border border-border rounded-xl px-4 py-3 text-sm font-bold flex items-center"
                        style={{ color: chainInfo.color }}>
                        {chainInfo.icon} {chainInfo.currency}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted2 mt-1">Leave empty to mint without listing for sale</p>
                  </div>

                  {/* Collection */}
                  <div>
                    <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">Collection (optional)</label>
                    <input value={collectionName} onChange={e => setCollectionName(e.target.value)}
                      placeholder="e.g. Breaking Bad: Alternate Endings"
                      className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rip placeholder:text-muted2" />
                    <p className="text-[10px] text-muted2 mt-1">Group NFTs into a collection for easier discovery</p>
                  </div>

                  {/* Cost Summary */}
                  <div className="bg-bg3 border border-bord2 rounded-xl p-4">
                    <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2">Mint Summary</div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Chain</span>
                        <span className="font-bold" style={{ color: chainInfo.color }}>{chainInfo.icon} {chainInfo.name}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Wallet</span>
                        <span className="text-white">{chainInfo.wallet}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Royalties</span>
                        <span className="text-lime font-bold">{royaltyPercent}% on resale</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Mint Fee</span>
                        <span className="text-muted2">{chainInfo.mintFee}</span>
                      </div>
                      {listPrice && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted">List Price</span>
                          <span className="text-white font-bold">{listPrice} {chainInfo.currency}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Navigation */}
              <div className="flex gap-3">
                <button onClick={() => setStep('details')}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-muted border border-border hover:border-bord2 transition-all">
                  ← Back
                </button>
                <button onClick={() => setStep('preview')}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition hover:brightness-110"
                  style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
                  Preview & Publish →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Preview & Publish ──────────────────── */}
          {step === 'preview' && (
            <div className="space-y-5">
              {/* Preview Card */}
              <div className="bg-bg2 border border-border rounded-xl overflow-hidden">
                {/* Thumbnail */}
                <div className="h-40 bg-bg3 flex items-center justify-center relative">
                  {thumbnail ? (
                    <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl opacity-20">🎬</span>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold text-black bg-cyan">{genre}</span>
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-white/10 backdrop-blur text-white">{mediaType}</span>
                  </div>
                  {mintNFT && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8px] font-bold text-white"
                      style={{ backgroundColor: chainInfo.color }}>
                      {chainInfo.icon} NFT
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <p className="text-[10px] text-muted2 italic mb-1">{show} {season && episode ? `· S${season}E${episode}` : ''}</p>
                  <h3 className="font-display text-2xl text-white mb-2">{title || 'Untitled'}</h3>
                  <p className="text-xs text-muted leading-relaxed mb-3">{description || 'No description'}</p>

                  {tags && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                        <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded bg-bg3 text-muted2">#{tag}</span>
                      ))}
                    </div>
                  )}

                  {mintNFT && (
                    <div className="border-t border-border pt-3 mt-3">
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted">
                          {chainInfo.icon} <span style={{ color: chainInfo.color }}>{chainInfo.name}</span>
                        </span>
                        <span className="text-muted">
                          Royalty: <span className="text-lime font-bold">{royaltyPercent}%</span>
                        </span>
                        {listPrice && (
                          <span className="text-muted">
                            Price: <span className="text-white font-bold">{listPrice} {chainInfo.currency}</span>
                          </span>
                        )}
                        {collectionName && (
                          <span className="text-muted">
                            📚 {collectionName}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Wallet Connection Warning */}
              {mintNFT && (
                <div className="bg-[#1a1a08] border border-gold/30 rounded-xl p-4 flex items-start gap-3">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <div className="text-sm font-bold text-gold mb-1">Wallet Required for NFT Minting</div>
                    <div className="text-xs text-muted">
                      Connect your {chainInfo.wallet} wallet to sign the mint transaction.
                      You'll need {chainInfo.mintFee} for the transaction fee.
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {publishError && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-red-400 text-sm">⚠️</span>
                  <div>
                    <div className="text-xs font-bold text-red-400">Publish Failed</div>
                    <div className="text-xs text-red-300/80 mt-0.5">{publishError}</div>
                  </div>
                </div>
              )}

              {/* Publish Button */}
              <div className="flex gap-3">
                <button onClick={() => setStep('nft')}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-muted border border-border hover:border-bord2 transition-all">
                  ← Back
                </button>
                <button onClick={handlePublish}
                  disabled={publishing || !canPublish}
                  className="flex-1 py-3.5 rounded-xl font-display text-lg tracking-widest text-white transition-all hover:brightness-110"
                  style={{ background: publishing ? '#333' : 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
                  {publishing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      {mintNFT ? 'Minting & Publishing...' : 'Publishing...'}
                    </span>
                  ) : (
                    `☽ ${mintNFT ? 'Mint & Publish' : 'Publish'}`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
