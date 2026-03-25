'use client';
// components/watch/WatchPage.tsx
// Full watch/playback page for viewing a creation — video player, details, comments, related
import { useState, useEffect } from 'react';

// ── Types ───────────────────────────────────────────────────────
interface WatchPageProps {
  contentId: string;
  onBack?: () => void;
  onCreatorClick?: (creatorId: string) => void;
}

interface WatchContent {
  id: string;
  title: string;
  description: string;
  show: string;
  genre: string;
  mediaType: string;
  season?: number;
  episode?: number;
  thumbnail?: string;
  videoUrl?: string;
  duration: number;        // seconds
  views: number;
  likes: number;
  remixes: number;
  createdAt: string;
  isNFT: boolean;
  chain?: string;
  mintAddress?: string;
  creator: {
    id: string;
    handle: string;
    displayName: string;
    avatar?: string;
    followers: number;
    isVerified: boolean;
  };
  tags: string[];
}

interface Comment {
  id: string;
  author: { handle: string; avatar?: string };
  text: string;
  likes: number;
  createdAt: string;
}

// ── Sample Data ─────────────────────────────────────────────────
const SAMPLE: WatchContent = {
  id: '1',
  title: 'Walter White Opens a Bakery — S1E1 Pilot',
  description: 'What if Walter White had channeled his chemistry genius into baking instead of cooking meth? In this alternate universe pilot, Walt discovers his true passion after his cancer diagnosis — artisan sourdough. Features AI-generated scenes, voice acting, and original score.',
  show: 'Breaking Bread',
  genre: 'TV Show',
  mediaType: 'episode',
  season: 1,
  episode: 1,
  views: 12400,
  likes: 890,
  remixes: 23,
  duration: 1320, // 22 min
  createdAt: '2026-03-19T04:30:00Z',
  isNFT: true,
  chain: 'solana',
  mintAddress: '7nYB...4kPq',
  creator: {
    id: 'u1',
    handle: 'heisenbaker',
    displayName: 'Heisenbaker',
    followers: 2400,
    isVerified: true,
  },
  tags: ['breakingbad', 'altending', 'comedy', 'ai', 'bakery'],
};

const SAMPLE_COMMENTS: Comment[] = [
  { id: 'c1', author: { handle: 'jessepinkman_fan' }, text: 'This is actually incredible. The bakery scene with Gus had me dying 😂', likes: 42, createdAt: '2026-03-20T10:00:00Z' },
  { id: 'c2', author: { handle: 'tuco_tight' }, text: 'TIGHT TIGHT TIGHT! But with croissants this time 🥐', likes: 28, createdAt: '2026-03-20T08:00:00Z' },
  { id: 'c3', author: { handle: 'saul_goodbread' }, text: 'Better Call Saul spin-off where he becomes a food critic when??', likes: 15, createdAt: '2026-03-19T22:00:00Z' },
];

const RELATED: { id: string; title: string; show: string; views: number; creator: string; duration: number }[] = [
  { id: 'r1', title: 'Walter White Opens a Bakery — S1E2', show: 'Breaking Bread', views: 8900, creator: 'heisenbaker', duration: 1260 },
  { id: 'r2', title: 'Goku Learns to Cook with Gordon Ramsay', show: 'Anime Crossover', views: 45000, creator: 'dbz_studio', duration: 900 },
  { id: 'r3', title: 'The Office: AI Christmas Special', show: 'The Office', views: 34000, creator: 'dundermifflin_ai', duration: 1800 },
  { id: 'r4', title: 'Naruto Opens a Ramen Shop IRL', show: 'Naruto', views: 22000, creator: 'hokage_studios', duration: 720 },
  { id: 'r5', title: 'Stranger Things S5: Fan Pilot', show: 'Stranger Things', views: 67000, creator: 'upside_down_ai', duration: 2400 },
];

// ── Helpers ──────────────────────────────────────────────────────
function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ── Component ───────────────────────────────────────────────────
export function WatchPage({ contentId, onBack, onCreatorClick }: WatchPageProps) {
  const content = SAMPLE; // In production: fetch by contentId
  const [liked, setLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>(SAMPLE_COMMENTS);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load real comments if contentId available
  useEffect(() => {
    if (!contentId) return;
    fetch(`/api/comments?creationId=${contentId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (data.length > 0) setComments(data.map((c: any) => ({
          id: c.id,
          author: { handle: c.user_id?.slice(0, 8) || 'anon' },
          text: c.content,
          likes: 0,
          createdAt: c.created_at,
        })));
      })
      .catch(() => {});
  }, [contentId]);

  // Handle like with API persistence
  const handleLike = () => {
    setLiked(!liked);
    if (contentId) {
      fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creationId: contentId }),
      }).catch(() => {});
    }
  };

  // Handle comment submit
  const handleComment = async () => {
    if (!commentText.trim() || !contentId) return;
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creationId: contentId, content: commentText }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments(prev => [{ id: newComment.id, author: { handle: 'you' }, text: commentText, likes: 0, createdAt: new Date().toISOString() }, ...prev]);
        setCommentText('');
      }
    } catch (_) {}
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Back */}
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted hover:text-white mb-3 transition">
          ← Back
        </button>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left: Player + Details ──────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Video Player */}
          <div className="aspect-video bg-black rounded-2xl overflow-hidden relative mb-4 border border-border group cursor-pointer"
            onClick={() => setIsPlaying(!isPlaying)}>
            {content.thumbnail ? (
              <img src={content.thumbnail} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-rip/20 via-bg to-cyan/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4 opacity-40">🎬</div>
                  <div className="text-xs text-muted">Preview not available — AI generation required</div>
                </div>
              </div>
            )}

            {/* Play button overlay */}
            {!isPlaying && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center transition-all group-hover:bg-black/40">
                <div className="w-16 h-16 rounded-full bg-rip/90 flex items-center justify-center transition-transform group-hover:scale-110">
                  <span className="text-white text-2xl ml-1">▶</span>
                </div>
              </div>
            )}

            {/* Duration badge */}
            <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white font-mono">
              {formatDuration(content.duration)}
            </div>

            {/* NFT badge */}
            {content.isNFT && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-bold text-white"
                style={{ backgroundColor: content.chain === 'solana' ? '#9945FF' : '#00A3E0' }}>
                {content.chain === 'solana' ? '◎' : '✕'} NFT
              </div>
            )}
          </div>

          {/* Title + meta */}
          <h1 className="font-display text-2xl sm:text-3xl text-white mb-2 leading-tight">{content.title}</h1>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted mb-4">
            <span>{formatNum(content.views)} views</span>
            <span>·</span>
            <span>{timeAgo(content.createdAt)}</span>
            <span>·</span>
            <span className="px-1.5 py-0.5 bg-bg2 border border-border rounded text-[9px]">{content.genre}</span>
            {content.season && content.episode && (
              <>
                <span>·</span>
                <span>S{content.season}E{content.episode}</span>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button onClick={handleLike}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                liked ? 'bg-rip/20 text-rip border border-rip/30' : 'bg-bg2 border border-border text-muted hover:text-white'
              }`}>
              <span>{liked ? '♥' : '♡'}</span>
              <span>{formatNum(content.likes + (liked ? 1 : 0))}</span>
            </button>

            <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-bg2 border border-border text-muted hover:text-white transition">
              🔄 Remix ({formatNum(content.remixes)})
            </button>

            <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-bg2 border border-border text-muted hover:text-white transition">
              ↗ Share
            </button>

            <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-bg2 border border-border text-muted hover:text-white transition">
              💾 Save
            </button>

            {content.isNFT && (
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white transition hover:brightness-110"
                style={{ background: content.chain === 'solana' ? '#9945FF' : '#00A3E0' }}>
                {content.chain === 'solana' ? '◎' : '✕'} View NFT
              </button>
            )}
          </div>

          {/* Creator card */}
          <div className="bg-bg2 border border-border rounded-xl p-4 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-bg3 flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={() => onCreatorClick?.(content.creator.id)}>
              {content.creator.avatar ? (
                <img src={content.creator.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg">☽</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white cursor-pointer hover:text-rip transition"
                  onClick={() => onCreatorClick?.(content.creator.id)}>
                  {content.creator.displayName}
                </span>
                {content.creator.isVerified && <span className="text-cyan text-[10px]">✓</span>}
              </div>
              <span className="text-[10px] text-muted">{formatNum(content.creator.followers)} followers</span>
            </div>
            <button onClick={() => setIsFollowing(!isFollowing)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                isFollowing
                  ? 'bg-bg3 border border-border text-muted'
                  : 'text-white'
              }`}
              style={!isFollowing ? { background: 'linear-gradient(90deg,#ff2d78,#a855f7)' } : {}}>
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>

          {/* Description */}
          <div className="bg-bg2 border border-border rounded-xl p-4 mb-4">
            <p className={`text-sm text-muted leading-relaxed ${showFullDesc ? '' : 'line-clamp-3'}`}>
              {content.description}
            </p>
            {content.description.length > 200 && (
              <button onClick={() => setShowFullDesc(!showFullDesc)}
                className="text-xs text-cyan mt-2 hover:underline">
                {showFullDesc ? 'Show less' : 'Show more'}
              </button>
            )}
            {content.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {content.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-bg3 text-[9px] text-muted2 rounded cursor-pointer hover:text-cyan transition">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* NFT Details (if applicable) */}
          {content.isNFT && (
            <div className="bg-bg2 border rounded-xl p-4 mb-4"
              style={{ borderColor: content.chain === 'solana' ? '#9945FF30' : '#00A3E030' }}>
              <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">
                {content.chain === 'solana' ? '◎' : '✕'} NFT Details
              </div>
              <div className="grid grid-cols-2 gap-y-2">
                <div>
                  <div className="text-[9px] text-muted uppercase">Chain</div>
                  <div className="text-xs font-bold" style={{ color: content.chain === 'solana' ? '#9945FF' : '#00A3E0' }}>
                    {content.chain === 'solana' ? 'Solana' : 'XRPL'}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-muted uppercase">Mint Address</div>
                  <div className="text-xs font-mono text-cyan">{content.mintAddress}</div>
                </div>
                <div>
                  <div className="text-[9px] text-muted uppercase">Royalties</div>
                  <div className="text-xs font-bold text-lime">5%</div>
                </div>
                <div>
                  <div className="text-[9px] text-muted uppercase">Owner</div>
                  <div className="text-xs text-white">@{content.creator.handle}</div>
                </div>
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="mb-8">
            <h3 className="font-display text-lg text-white mb-3">Comments ({comments.length})</h3>

            {/* Comment input */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-bg3 flex items-center justify-center text-sm">☽</div>
              <div className="flex-1">
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleComment()}
                  placeholder="Add a comment..."
                  className="w-full bg-transparent border-b border-border py-2 text-sm text-white outline-none focus:border-rip placeholder:text-muted2" />
                {commentText && (
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setCommentText('')} className="px-3 py-1 text-xs text-muted hover:text-white">Cancel</button>
                    <button onClick={handleComment}
                      className="px-4 py-1.5 rounded-full text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
                      Comment
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Comment list */}
            <div className="space-y-4">
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-bg3 flex items-center justify-center text-[10px]">
                    {c.author.handle[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-white">@{c.author.handle}</span>
                      <span className="text-[9px] text-muted2">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-muted leading-relaxed">{c.text}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <button className="text-[10px] text-muted hover:text-white transition">♡ {c.likes}</button>
                      <button className="text-[10px] text-muted hover:text-white transition">Reply</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Related Content ─────────────────────── */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <h3 className="font-display text-lg text-white mb-3">Up Next</h3>
          <div className="space-y-3">
            {RELATED.map(item => (
              <div key={item.id} className="flex gap-2 cursor-pointer group">
                {/* Thumbnail */}
                <div className="w-40 h-24 flex-shrink-0 bg-bg2 border border-border rounded-lg overflow-hidden relative">
                  <div className="w-full h-full bg-gradient-to-br from-rip/10 to-cyan/10 flex items-center justify-center">
                    <span className="text-2xl opacity-20">🎬</span>
                  </div>
                  <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-[8px] text-white font-mono">
                    {formatDuration(item.duration)}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white leading-tight line-clamp-2 group-hover:text-rip transition">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-muted mt-1">@{item.creator}</p>
                  <p className="text-[10px] text-muted2">{formatNum(item.views)} views</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
