'use client';
// components/wallet/NFTGallery.tsx
// Visual NFT gallery — shows minted creations with thumbnails, metadata, and actions
// Replaces the basic list in WalletTab with a rich Letterboxd/OpenSea-style grid
import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowser } from '@/lib/supabase';
import { ShareDialog } from '../shared/ShareDialog';

// ── Types ───────────────────────────────────────────────────────
interface NFTGalleryProps {
  user: User;
  walletAddress?: string | null;
  onMintNew?: () => void;
}

interface NFTItem {
  id: string;
  creationId: string;
  title: string;
  description: string;
  thumbnail: string;
  genre: string;
  showTitle: string;
  mintAddress: string;
  metadataUri: string;
  editionNumber: number;
  maxEditions: number;
  royaltyBps: number;
  listedPriceSol: number | null;
  status: 'minted' | 'listed' | 'sold' | 'burned';
  mintedAt: string;
  chain: 'solana' | 'xrpl';
  creator: string;
  explorerUrl: string;
}

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'minted' | 'listed' | 'sold';

// ── Sample NFTs ─────────────────────────────────────────────────
const SAMPLE_NFTS: NFTItem[] = [
  {
    id: 'nft-1', creationId: 'c-1', title: 'Genesis ReMiX #001',
    description: 'The very first creation minted on ReMiX I.P.', thumbnail: '',
    genre: 'TV Show', showTitle: 'Breaking Bad', mintAddress: 'DbnD8xPr...q2xD5Nj',
    metadataUri: '', editionNumber: 1, maxEditions: 1, royaltyBps: 500,
    listedPriceSol: 2.5, status: 'listed', mintedAt: '2026-03-15',
    chain: 'solana', creator: 'You', explorerUrl: 'https://solscan.io',
  },
  {
    id: 'nft-2', creationId: 'c-2', title: 'Neon Ronin Ep.1',
    description: 'Cyberpunk anime short — first episode pilot.', thumbnail: '',
    genre: 'Anime', showTitle: 'Neon Ronin', mintAddress: 'A7fK2m...x9bQ3',
    metadataUri: '', editionNumber: 1, maxEditions: 100, royaltyBps: 750,
    listedPriceSol: null, status: 'minted', mintedAt: '2026-03-28',
    chain: 'solana', creator: 'You', explorerUrl: 'https://solscan.io',
  },
];

// ── Main Component ──────────────────────────────────────────────
export function NFTGallery({ user, walletAddress, onMintNew }: NFTGalleryProps) {
  const [nfts, setNfts] = useState<NFTItem[]>(SAMPLE_NFTS);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [selectedNFT, setSelectedNFT] = useState<NFTItem | null>(null);
  const [shareNFT, setShareNFT] = useState<NFTItem | null>(null);
  const [listingPrice, setListingPrice] = useState('');
  const [listing, setListing] = useState(false);

  // ── Load NFTs with creation data ──────────────────────────────
  const loadNFTs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/nfts');
      if (!res.ok) return;
      const { nfts: dbNfts } = await res.json();
      if (!dbNfts || dbNfts.length === 0) return;

      // Enrich with creation data
      const supabase = createSupabaseBrowser();
      const creationIds = dbNfts.map((n: any) => n.creation_id).filter(Boolean);
      const { data: creations } = await supabase
        .from('creations')
        .select('id, title, logline, genre, show_title, thumbnail_url')
        .in('id', creationIds);

      const creationMap = new Map((creations || []).map((c: any) => [c.id, c]));

      const enriched: NFTItem[] = dbNfts.map((n: any) => {
        const creation = creationMap.get(n.creation_id) || {};
        return {
          id: n.id,
          creationId: n.creation_id,
          title: (creation as any).title || `NFT #${n.edition_number || 1}`,
          description: (creation as any).logline || '',
          thumbnail: (creation as any).thumbnail_url || '',
          genre: (creation as any).genre || '',
          showTitle: (creation as any).show_title || '',
          mintAddress: n.mint_address,
          metadataUri: n.metadata_uri,
          editionNumber: n.edition_number || 1,
          maxEditions: n.max_editions || 1,
          royaltyBps: n.royalty_bps || 500,
          listedPriceSol: n.listed_price_sol,
          status: n.listed_price_sol ? 'listed' : n.status || 'minted',
          mintedAt: n.minted_at,
          chain: 'solana',
          creator: 'You',
          explorerUrl: `https://solscan.io/token/${n.mint_address}`,
        };
      });

      setNfts([...enriched, ...SAMPLE_NFTS]);
    } catch (err) {
      console.error('Load NFTs error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNFTs(); }, [loadNFTs]);

  // ── List / Delist ─────────────────────────────────────────────
  async function handleList(nftId: string, price: number) {
    setListing(true);
    try {
      const res = await fetch('/api/nfts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nftId, action: 'list', priceSol: price }),
      });
      if (res.ok) {
        setNfts(prev => prev.map(n =>
          n.id === nftId ? { ...n, listedPriceSol: price, status: 'listed' } : n
        ));
        setSelectedNFT(null);
        setListingPrice('');
      }
    } catch (err) {
      console.error('List error:', err);
    }
    setListing(false);
  }

  async function handleDelist(nftId: string) {
    try {
      const res = await fetch('/api/nfts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nftId, action: 'delist' }),
      });
      if (res.ok) {
        setNfts(prev => prev.map(n =>
          n.id === nftId ? { ...n, listedPriceSol: null, status: 'minted' } : n
        ));
      }
    } catch (err) {
      console.error('Delist error:', err);
    }
  }

  // ── Filter ────────────────────────────────────────────────────
  const filtered = nfts.filter(n => filter === 'all' || n.status === filter);

  // Stats
  const totalMinted = nfts.length;
  const totalListed = nfts.filter(n => n.status === 'listed').length;
  const totalValue = nfts.filter(n => n.listedPriceSol).reduce((s, n) => s + (n.listedPriceSol || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-2xl text-white">💎 NFT Gallery</h2>
          <p className="text-xs text-muted">Your minted creations on-chain</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="px-3 py-1.5 bg-bg2 border border-border rounded-lg text-xs text-muted hover:text-white transition">
            {viewMode === 'grid' ? '☰ List' : '▦ Grid'}
          </button>
          {onMintNew && (
            <button onClick={onMintNew}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-white transition hover:brightness-110"
              style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
              + Mint New
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-bg2 border border-border rounded-xl p-3 text-center">
          <p className="text-[9px] text-muted uppercase">Minted</p>
          <p className="font-display text-xl text-white">{totalMinted}</p>
        </div>
        <div className="bg-bg2 border border-border rounded-xl p-3 text-center">
          <p className="text-[9px] text-muted uppercase">Listed</p>
          <p className="font-display text-xl text-lime">{totalListed}</p>
        </div>
        <div className="bg-bg2 border border-border rounded-xl p-3 text-center">
          <p className="text-[9px] text-muted uppercase">Floor Value</p>
          <p className="font-display text-xl text-cyan">{totalValue > 0 ? `${totalValue.toFixed(1)} SOL` : '—'}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {([
          { id: 'all', label: 'All' },
          { id: 'minted', label: '✅ Minted' },
          { id: 'listed', label: '🏷️ Listed' },
          { id: 'sold', label: '💰 Sold' },
        ] as { id: FilterStatus; label: string }[]).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
              filter === f.id
                ? 'bg-rip/10 border border-rip text-rip'
                : 'bg-bg2 border border-border text-muted hover:text-white'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin text-2xl mb-2">💎</div>
          <p className="text-xs text-muted">Loading NFTs...</p>
        </div>
      )}

      {/* ── Grid View ────────────────────────────────────────── */}
      {viewMode === 'grid' && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(nft => (
            <NFTCard key={nft.id} nft={nft}
              onSelect={() => setSelectedNFT(nft)}
              onShare={() => setShareNFT(nft)} />
          ))}
          {filtered.length === 0 && <EmptyState onMint={onMintNew} />}
        </div>
      )}

      {/* ── List View ────────────────────────────────────────── */}
      {viewMode === 'list' && !loading && (
        <div className="space-y-2">
          {filtered.map(nft => (
            <NFTRow key={nft.id} nft={nft}
              onSelect={() => setSelectedNFT(nft)}
              onShare={() => setShareNFT(nft)}
              onDelist={() => handleDelist(nft.id)} />
          ))}
          {filtered.length === 0 && <EmptyState onMint={onMintNew} />}
        </div>
      )}

      {/* ── Detail Modal ─────────────────────────────────────── */}
      {selectedNFT && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur z-[100] flex items-center justify-center p-4"
          onClick={() => setSelectedNFT(null)}>
          <div className="bg-bg border border-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            {/* Header image */}
            <div className="h-48 relative bg-bg2 rounded-t-2xl overflow-hidden">
              {selectedNFT.thumbnail ? (
                <img src={selectedNFT.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500/20 via-bg2 to-rip/20 flex items-center justify-center">
                  <span className="text-7xl opacity-20">💎</span>
                </div>
              )}
              <button onClick={() => setSelectedNFT(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur text-white flex items-center justify-center text-sm">
                ✕
              </button>
              <div className="absolute top-3 left-3 flex gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  selectedNFT.status === 'listed' ? 'bg-lime/20 text-lime' :
                  selectedNFT.status === 'sold' ? 'bg-gold/20 text-gold' :
                  'bg-purple-500/20 text-purple-400'
                }`}>
                  {selectedNFT.status === 'listed' ? '🏷️ Listed' : selectedNFT.status === 'sold' ? '💰 Sold' : '✅ Minted'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/10 backdrop-blur text-white">
                  #{selectedNFT.editionNumber}/{selectedNFT.maxEditions}
                </span>
              </div>
            </div>

            <div className="p-5">
              <h2 className="font-display text-2xl text-white mb-1">{selectedNFT.title}</h2>
              {selectedNFT.showTitle && (
                <p className="text-xs text-muted mb-2">{selectedNFT.showTitle} · {selectedNFT.genre}</p>
              )}
              <p className="text-sm text-muted leading-relaxed mb-4">{selectedNFT.description}</p>

              {/* On-chain details */}
              <div className="bg-bg2 border border-border rounded-xl p-4 mb-4 space-y-2">
                <div className="text-[9px] text-muted uppercase tracking-widest mb-1">On-Chain Details</div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Mint Address</span>
                  <span className="text-cyan font-mono">{selectedNFT.mintAddress.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Chain</span>
                  <span className="text-white">◎ Solana</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Royalties</span>
                  <span className="text-lime">{(selectedNFT.royaltyBps / 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Editions</span>
                  <span className="text-white">{selectedNFT.editionNumber} / {selectedNFT.maxEditions}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Minted</span>
                  <span className="text-white">{new Date(selectedNFT.mintedAt).toLocaleDateString()}</span>
                </div>
                {selectedNFT.listedPriceSol && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Listed Price</span>
                    <span className="text-lime font-bold">{selectedNFT.listedPriceSol} SOL</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {selectedNFT.status === 'minted' && (
                  <div>
                    <div className="flex gap-2 mb-2">
                      <input type="number" step="0.01" min="0.01" value={listingPrice}
                        onChange={e => setListingPrice(e.target.value)}
                        placeholder="Price in SOL..."
                        className="flex-1 bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-lime" />
                      <button
                        onClick={() => listingPrice ? handleList(selectedNFT.id, parseFloat(listingPrice)) : null}
                        disabled={!listingPrice || listing}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-lime text-black hover:brightness-110 transition disabled:opacity-50">
                        {listing ? '...' : '🏷️ List for Sale'}
                      </button>
                    </div>
                  </div>
                )}

                {selectedNFT.status === 'listed' && (
                  <button onClick={() => handleDelist(selectedNFT.id)}
                    className="w-full py-2.5 rounded-lg text-xs font-bold border border-rip/30 text-rip hover:bg-rip/10 transition">
                    Remove Listing
                  </button>
                )}

                <div className="flex gap-2">
                  <a href={selectedNFT.explorerUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-lg text-xs font-bold border border-cyan/30 text-cyan text-center hover:bg-cyan/10 transition">
                    View on Explorer ↗
                  </a>
                  <button onClick={() => { setShareNFT(selectedNFT); setSelectedNFT(null); }}
                    className="flex-1 py-2.5 rounded-lg text-xs font-bold border border-border text-muted hover:text-white text-center transition">
                    📤 Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share */}
      <ShareDialog isOpen={!!shareNFT} onClose={() => setShareNFT(null)}
        title={shareNFT?.title || ''} description={shareNFT?.description}
        url={shareNFT?.explorerUrl || ''} type="creation" />
    </div>
  );
}

// ── NFT Card (grid view) ────────────────────────────────────────
function NFTCard({ nft, onSelect, onShare }: {
  nft: NFTItem; onSelect: () => void; onShare: () => void;
}) {
  return (
    <div className="group cursor-pointer" onClick={onSelect}>
      <div className="aspect-square relative bg-bg2 border border-border rounded-xl overflow-hidden mb-2 hover:border-purple-500/40 transition-all">
        {nft.thumbnail ? (
          <img src={nft.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500/20 via-bg3 to-rip/10 flex items-center justify-center">
            <span className="text-5xl opacity-20 group-hover:opacity-40 transition">💎</span>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span className={`px-1.5 py-0.5 rounded text-[7px] font-bold ${
            nft.status === 'listed' ? 'bg-lime/20 text-lime backdrop-blur' :
            nft.status === 'sold' ? 'bg-gold/20 text-gold backdrop-blur' :
            'bg-purple-500/20 text-purple-400 backdrop-blur'
          }`}>
            {nft.status === 'listed' ? '🏷️ Listed' : nft.status === 'sold' ? '💰 Sold' : '✅ Owned'}
          </span>
        </div>

        {/* Edition */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[8px] text-white font-mono">
          #{nft.editionNumber}/{nft.maxEditions}
        </div>

        {/* Price */}
        {nft.listedPriceSol && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-lime/20 backdrop-blur text-[9px] text-lime font-bold">
            {nft.listedPriceSol} SOL
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-sm font-bold">View Details</span>
        </div>
      </div>

      <h4 className="font-display text-sm text-white truncate">{nft.title}</h4>
      <div className="flex items-center gap-2 text-[9px] text-muted">
        <span className="font-mono">{nft.mintAddress.slice(0, 8)}...</span>
        {nft.genre && <span>· {nft.genre}</span>}
      </div>
    </div>
  );
}

// ── NFT Row (list view) ─────────────────────────────────────────
function NFTRow({ nft, onSelect, onShare, onDelist }: {
  nft: NFTItem; onSelect: () => void; onShare: () => void; onDelist: () => void;
}) {
  return (
    <div className="bg-bg2 border border-border rounded-xl p-3 flex items-center gap-3 hover:border-purple-500/40 transition cursor-pointer"
      onClick={onSelect}>
      <div className="w-14 h-14 rounded-lg bg-bg3 flex-shrink-0 overflow-hidden">
        {nft.thumbnail ? (
          <img src={nft.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">💎</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-white truncate">{nft.title}</h4>
        <div className="flex items-center gap-2 text-[9px] text-muted">
          <span className="font-mono">{nft.mintAddress.slice(0, 8)}...</span>
          <span>#{nft.editionNumber}/{nft.maxEditions}</span>
          <span className={`px-1 py-0.5 rounded ${
            nft.status === 'listed' ? 'text-lime' : nft.status === 'sold' ? 'text-gold' : 'text-purple-400'
          }`}>
            {nft.status}
          </span>
        </div>
      </div>
      {nft.listedPriceSol && (
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-lime">{nft.listedPriceSol} SOL</p>
          <button onClick={e => { e.stopPropagation(); onDelist(); }}
            className="text-[9px] text-rip hover:underline">Delist</button>
        </div>
      )}
      <button onClick={e => { e.stopPropagation(); onShare(); }}
        className="text-muted hover:text-white transition flex-shrink-0">📤</button>
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────
function EmptyState({ onMint }: { onMint?: () => void }) {
  return (
    <div className="col-span-full text-center py-12">
      <div className="text-6xl mb-3 opacity-30">💎</div>
      <h3 className="font-display text-xl text-white mb-1">No NFTs yet</h3>
      <p className="text-muted text-sm mb-4">Mint your creations as NFTs from the Publish flow</p>
      {onMint && (
        <button onClick={onMint}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:brightness-110"
          style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
          + Mint Your First NFT
        </button>
      )}
    </div>
  );
}
