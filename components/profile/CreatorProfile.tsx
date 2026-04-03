'use client';
// components/profile/CreatorProfile.tsx
// Creator profile page with their shows, NFTs, stats, and follow button
// Fetches real data from Supabase, falls back to mock data
import { useState, useMemo, useEffect } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';

// ── Types ───────────────────────────────────────────────────────
interface Creator {
  id: string;
  handle: string;
  displayName: string;
  avatar: string;
  banner?: string;
  bio: string;
  joinedAt: string;
  followers: number;
  following: number;
  totalViews: number;
  totalLikes: number;
  verified: boolean;
  walletAddress?: string;
  socials?: { twitter?: string; tiktok?: string; youtube?: string };
}

interface Creation {
  id: string;
  title: string;
  show: string;
  thumbnail: string;
  views: number;
  likes: number;
  remixes: number;
  genre: string;
  mediaType: string;
  isNFT: boolean;
  nftChain?: string;
  nftPrice?: string;
  createdAt: string;
}

type ProfileTab = 'creations' | 'nfts' | 'collections' | 'about';

// ── Mock data ───────────────────────────────────────────────────
const MOCK_CREATOR: Creator = {
  id: '1',
  handle: 'heisenberg_remix',
  displayName: 'Heisenberg Remixed',
  avatar: '',
  banner: '',
  bio: 'Creating alternate reality TV shows with AI. Breaking Bad universe enthusiast. Season 6 coming soon.',
  joinedAt: '2026-01-15',
  followers: 2847,
  following: 142,
  totalViews: 156000,
  totalLikes: 12400,
  verified: true,
  walletAddress: 'DbnD...D5Nj',
  socials: { twitter: 'heisenberg_rip', tiktok: 'heisenberg_remix' },
};

const MOCK_CREATIONS: Creation[] = [
  {
    id: 'c1', title: 'Walter White Opens a Bakery', show: 'Breaking Bad',
    thumbnail: '', views: 45200, likes: 3200, remixes: 89,
    genre: 'TV Show', mediaType: 'episode', isNFT: true, nftChain: 'solana', nftPrice: '0.5 SOL',
    createdAt: '2026-03-10',
  },
  {
    id: 'c2', title: 'Jesse Pinkman: Art School', show: 'Breaking Bad',
    thumbnail: '', views: 38100, likes: 2800, remixes: 67,
    genre: 'TV Show', mediaType: 'episode', isNFT: true, nftChain: 'solana', nftPrice: '0.3 SOL',
    createdAt: '2026-03-05',
  },
  {
    id: 'c3', title: 'Gus Fring Cooking Show', show: 'Breaking Bad',
    thumbnail: '', views: 52000, likes: 4100, remixes: 112,
    genre: 'TV Show', mediaType: 'scene', isNFT: false,
    createdAt: '2026-02-28',
  },
  {
    id: 'c4', title: 'RiP Theme Song - Electronic Remix', show: 'Original',
    thumbnail: '', views: 8900, likes: 920, remixes: 34,
    genre: 'Music', mediaType: 'music', isNFT: true, nftChain: 'xrpl', nftPrice: '15 XRP',
    createdAt: '2026-02-20',
  },
];

// ── Component ───────────────────────────────────────────────────
export function CreatorProfile({ creatorId }: { creatorId?: string }) {
  const [tab, setTab] = useState<ProfileTab>('creations');
  const [isFollowing, setIsFollowing] = useState(false);
  const [creator, setCreator] = useState<Creator>(MOCK_CREATOR);
  const [creations, setCreations] = useState<Creation[]>(MOCK_CREATIONS);
  const [loading, setLoading] = useState(!!creatorId);

  // Fetch real creator data from Supabase
  useEffect(() => {
    if (!creatorId) return;
    (async () => {
      try {
        setLoading(true);
        const supabase = createSupabaseBrowser();
        
        // Fetch creator profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', creatorId)
          .single();

        if (profile) {
          setCreator({
            id: profile.id,
            handle: profile.username || 'anonymous',
            displayName: profile.display_name || profile.username || 'Creator',
            avatar: profile.avatar_url || '',
            banner: '',
            bio: profile.bio || '',
            joinedAt: profile.created_at || '',
            followers: profile.followers_count || 0,
            following: profile.following_count || 0,
            totalViews: 0,
            totalLikes: 0,
            verified: profile.tier !== 'free',
            walletAddress: profile.wallet_address,
            socials: profile.socials || {},
          });
        }

        // Fetch creator's public creations
        const { data: works } = await supabase
          .from('creations')
          .select('*')
          .eq('user_id', creatorId)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(50);

        if (works && works.length > 0) {
          const mapped: Creation[] = works.map((c: any) => ({
            id: c.id,
            title: c.title || c.show_title || 'Untitled',
            show: c.show_title || '',
            thumbnail: c.thumbnail_url || '',
            views: c.likes_count || 0,
            likes: c.likes_count || 0,
            remixes: c.remix_count || 0,
            genre: c.genre || 'Remix',
            mediaType: c.type || 'episode',
            isNFT: !!c.nft_mint_address,
            nftChain: c.nft_chain,
            nftPrice: c.nft_price,
            createdAt: c.created_at,
          }));
          setCreations(mapped);

          // Update stats from real data
          const totalViews = mapped.reduce((sum, c) => sum + c.views, 0);
          const totalLikes = mapped.reduce((sum, c) => sum + c.likes, 0);
          setCreator(prev => ({ ...prev, totalViews, totalLikes }));
        }
      } catch (err) {
        console.warn('CreatorProfile load error:', err);
        // Falls back to mock data
      } finally {
        setLoading(false);
      }
    })();
  }, [creatorId]);

  const nfts = useMemo(() => creations.filter(c => c.isNFT), [creations]);

  const formatNum = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
  };

  const tabs: { id: ProfileTab; label: string; count?: number }[] = [
    { id: 'creations',   label: 'Creations',  count: creations.length },
    { id: 'nfts',        label: 'NFTs',        count: nfts.length },
    { id: 'collections', label: 'Collections', count: 1 },
    { id: 'about',       label: 'About' },
  ];

  return (
    <div className="min-h-screen bg-bg">
      {/* Banner */}
      <div className="h-40 sm:h-56 bg-gradient-to-br from-rip/30 via-purple/20 to-cyan/10 relative">
        {creator.banner && (
          <img src={creator.banner} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent" />
      </div>

      {/* Profile Header */}
      <div className="max-w-5xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex items-end gap-4 sm:gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-bg bg-bg2 flex items-center justify-center shrink-0 overflow-hidden">
            {creator.avatar ? (
              <img src={creator.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">☽</span>
            )}
          </div>

          {/* Name & actions */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="font-display text-2xl sm:text-3xl text-white truncate">{creator.displayName}</h1>
              {creator.verified && (
                <span className="w-5 h-5 bg-cyan rounded-full flex items-center justify-center text-[10px] text-black font-bold shrink-0">✓</span>
              )}
            </div>
            <p className="text-sm text-muted">@{creator.handle}</p>
          </div>

          {/* Follow button */}
          <button onClick={() => setIsFollowing(!isFollowing)}
            className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              isFollowing
                ? 'bg-bg3 border border-border text-muted hover:border-rip hover:text-rip'
                : 'text-white hover:brightness-110'
            }`}
            style={!isFollowing ? { background: 'linear-gradient(90deg,#ff2d78,#a855f7)' } : {}}>
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>

        {/* Bio */}
        <p className="text-sm text-muted mt-4 max-w-2xl leading-relaxed">{creator.bio}</p>

        {/* Stats Row */}
        <div className="flex items-center gap-6 mt-4">
          <div className="text-center">
            <div className="font-display text-xl text-white">{formatNum(creator.followers)}</div>
            <div className="text-[9px] text-muted uppercase tracking-widest">Followers</div>
          </div>
          <div className="text-center">
            <div className="font-display text-xl text-white">{formatNum(creator.following)}</div>
            <div className="text-[9px] text-muted uppercase tracking-widest">Following</div>
          </div>
          <div className="text-center">
            <div className="font-display text-xl text-white">{formatNum(creator.totalViews)}</div>
            <div className="text-[9px] text-muted uppercase tracking-widest">Views</div>
          </div>
          <div className="text-center">
            <div className="font-display text-xl text-white">{formatNum(creator.totalLikes)}</div>
            <div className="text-[9px] text-muted uppercase tracking-widest">Likes</div>
          </div>
          {creator.walletAddress && (
            <div className="ml-auto">
              <span className="text-[10px] font-mono text-muted2 bg-bg3 px-2 py-1 rounded border border-border">
                ◎ {creator.walletAddress}
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-6 border-b border-border">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-bold transition-all border-b-2 ${
                tab === t.id
                  ? 'border-rip text-rip'
                  : 'border-transparent text-muted hover:text-white'
              }`}>
              {t.label}
              {t.count !== undefined && (
                <span className="ml-1.5 text-[10px] opacity-60">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Creations Grid */}
        {(tab === 'creations' || tab === 'nfts') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(tab === 'nfts' ? nfts : creations).map(item => (
              <div key={item.id} className="bg-bg2 border border-border rounded-xl overflow-hidden hover:border-bord2 transition-all group cursor-pointer">
                {/* Thumbnail */}
                <div className="aspect-video bg-bg3 relative overflow-hidden">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl opacity-20">
                        {item.mediaType === 'music' ? '🎵' : item.mediaType === 'scene' ? '🎬' : '📺'}
                      </span>
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold text-black bg-cyan">{item.genre}</span>
                    {item.isNFT && (
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-bold text-white"
                        style={{ backgroundColor: item.nftChain === 'solana' ? '#9945FF' : '#00A3E0' }}>
                        {item.nftChain === 'solana' ? '◎' : '✕'} NFT
                      </span>
                    )}
                  </div>
                  {item.nftPrice && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/70 backdrop-blur text-[10px] font-bold text-lime">
                      {item.nftPrice}
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-3">
                  <p className="text-[10px] text-muted2 mb-0.5">{item.show}</p>
                  <h3 className="text-sm font-bold text-white truncate mb-2">{item.title}</h3>
                  <div className="flex items-center gap-3 text-[10px] text-muted2">
                    <span>👁 {formatNum(item.views)}</span>
                    <span>♡ {formatNum(item.likes)}</span>
                    <span>🔄 {formatNum(item.remixes)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Collections */}
        {tab === 'collections' && (
          <div className="space-y-4">
            <div className="bg-bg2 border border-border rounded-xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-bg3 flex items-center justify-center">
                  <span className="text-3xl">📚</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-xl text-white mb-1">Breaking Bad: Alternate Reality</h3>
                  <p className="text-xs text-muted mb-2">A complete alternate universe where Walter White never cooked meth</p>
                  <div className="flex items-center gap-4 text-xs text-muted2">
                    <span>12 episodes</span>
                    <span>◎ Floor: 0.3 SOL</span>
                    <span>Volume: 4.2 SOL</span>
                  </div>
                </div>
                <button className="px-4 py-2 rounded-xl text-xs font-bold text-white border border-border hover:border-rip transition">
                  View Collection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* About */}
        {tab === 'about' && (
          <div className="max-w-xl space-y-4">
            <div className="bg-bg2 border border-border rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">About</h3>
              <p className="text-sm text-muted leading-relaxed">{creator.bio}</p>
            </div>

            <div className="bg-bg2 border border-border rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Joined</span>
                  <span className="text-white">{new Date(creator.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
                {creator.walletAddress && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Wallet</span>
                    <span className="font-mono text-muted2">{creator.walletAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {creator.socials && (
              <div className="bg-bg2 border border-border rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-3">Socials</h3>
                <div className="flex gap-3">
                  {creator.socials.twitter && (
                    <a href={`https://twitter.com/${creator.socials.twitter}`} target="_blank" rel="noopener"
                      className="px-3 py-2 bg-bg3 border border-border rounded-lg text-xs text-muted hover:text-white transition">
                      𝕏 @{creator.socials.twitter}
                    </a>
                  )}
                  {creator.socials.tiktok && (
                    <a href={`https://tiktok.com/@${creator.socials.tiktok}`} target="_blank" rel="noopener"
                      className="px-3 py-2 bg-bg3 border border-border rounded-lg text-xs text-muted hover:text-white transition">
                      ♪ @{creator.socials.tiktok}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
