'use client';
// components/publish/SocialAutoPost.tsx
// Auto-post to social platforms when publishing a creation
// Supports: TikTok, X (Twitter), Instagram, YouTube, Discord
// Provides per-platform toggles, caption customization, scheduling, and post status
import { useState, useCallback, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';

// ── Types ───────────────────────────────────────────────────────
interface SocialAutoPostProps {
  user: User;
  creation: {
    id: string;
    title: string;
    description: string;
    thumbnail?: string;
    videoUrl?: string;
    genre?: string;
    showTitle?: string;
  };
  onComplete: (results: PostResult[]) => void;
  onSkip: () => void;
}

interface Platform {
  id: PlatformId;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
  description: string;
  formats: string[];
  maxCaptionLength: number;
  supportsVideo: boolean;
  supportsImage: boolean;
  supportsSchedule: boolean;
}

type PlatformId = 'tiktok' | 'twitter' | 'instagram' | 'youtube' | 'discord';

interface PostConfig {
  enabled: boolean;
  caption: string;
  scheduled: boolean;
  scheduledAt?: string;
  hashtags: string[];
  crossPost: boolean;
}

interface PostResult {
  platform: PlatformId;
  success: boolean;
  postUrl?: string;
  error?: string;
}

// ── Platform Definitions ────────────────────────────────────────
const PLATFORMS: Platform[] = [
  {
    id: 'tiktok', name: 'TikTok', icon: '♪', color: '#00f2ea',
    connected: false, description: 'Post as a TikTok video',
    formats: ['Video (9:16)', 'Video (1:1)'], maxCaptionLength: 2200,
    supportsVideo: true, supportsImage: false, supportsSchedule: true,
  },
  {
    id: 'twitter', name: 'X (Twitter)', icon: '𝕏', color: '#000',
    connected: false, description: 'Tweet with media attachment',
    formats: ['Tweet + Video', 'Tweet + Image'], maxCaptionLength: 280,
    supportsVideo: true, supportsImage: true, supportsSchedule: true,
  },
  {
    id: 'instagram', name: 'Instagram', icon: '📷', color: '#E4405F',
    connected: false, description: 'Post as Reel or Feed post',
    formats: ['Reel (9:16)', 'Feed Post (1:1)', 'Story'], maxCaptionLength: 2200,
    supportsVideo: true, supportsImage: true, supportsSchedule: true,
  },
  {
    id: 'youtube', name: 'YouTube', icon: '▶', color: '#FF0000',
    connected: true, description: 'Upload as YouTube Short or Video',
    formats: ['YouTube Short', 'Full Video'], maxCaptionLength: 5000,
    supportsVideo: true, supportsImage: false, supportsSchedule: true,
  },
  {
    id: 'discord', name: 'Discord', icon: '🎮', color: '#5865F2',
    connected: true, description: 'Share to community channel',
    formats: ['Embed + Video', 'Embed + Image'], maxCaptionLength: 4000,
    supportsVideo: true, supportsImage: true, supportsSchedule: false,
  },
];

// ── Default Hashtags ────────────────────────────────────────────
const DEFAULT_HASHTAGS = ['RiP', 'RemixIP', 'AICreator', 'AIVideo', 'Web3'];

// ── Component ───────────────────────────────────────────────────
export function SocialAutoPost({ user, creation, onComplete, onSkip }: SocialAutoPostProps) {
  const [configs, setConfigs] = useState<Record<PlatformId, PostConfig>>(() => {
    const initial: Record<string, PostConfig> = {};
    for (const p of PLATFORMS) {
      initial[p.id] = {
        enabled: p.connected,
        caption: creation.title,
        scheduled: false,
        hashtags: [...DEFAULT_HASHTAGS, ...(creation.genre ? [creation.genre.replace(/\s/g, '')] : [])],
        crossPost: false,
      };
    }
    return initial as Record<PlatformId, PostConfig>;
  });

  const [posting, setPosting] = useState(false);
  const [postStep, setPostStep] = useState<PlatformId | null>(null);
  const [results, setResults] = useState<PostResult[]>([]);
  const [showAdvanced, setShowAdvanced] = useState<PlatformId | null>(null);
  const [customHashtag, setCustomHashtag] = useState('');
  const [connectingPlatform, setConnectingPlatform] = useState<PlatformId | null>(null);

  // Build caption with hashtags
  const buildCaption = useCallback((platformId: PlatformId) => {
    const config = configs[platformId];
    const platform = PLATFORMS.find(p => p.id === platformId)!;
    const tags = config.hashtags.map(h => `#${h}`).join(' ');
    const fullCaption = `${config.caption}\n\n${tags}`;
    return fullCaption.slice(0, platform.maxCaptionLength);
  }, [configs]);

  // Toggle platform
  const togglePlatform = (id: PlatformId) => {
    setConfigs(prev => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled },
    }));
  };

  // Update config
  const updateConfig = (id: PlatformId, updates: Partial<PostConfig>) => {
    setConfigs(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates },
    }));
  };

  // Add hashtag
  const addHashtag = (platformId: PlatformId) => {
    if (!customHashtag.trim()) return;
    const cleaned = customHashtag.replace(/^#/, '').replace(/\s/g, '');
    updateConfig(platformId, {
      hashtags: [...configs[platformId].hashtags, cleaned],
    });
    setCustomHashtag('');
  };

  // Remove hashtag
  const removeHashtag = (platformId: PlatformId, tag: string) => {
    updateConfig(platformId, {
      hashtags: configs[platformId].hashtags.filter(h => h !== tag),
    });
  };

  // Connect platform (opens OAuth flow)
  const handleConnect = async (platformId: PlatformId) => {
    setConnectingPlatform(platformId);
    // In production: redirect to /api/social/connect?platform=xxx
    // For now: simulate connection
    setTimeout(() => {
      setConnectingPlatform(null);
      // Update platform connected status
      const updated = PLATFORMS.find(p => p.id === platformId);
      if (updated) updated.connected = true;
      togglePlatform(platformId);
    }, 1500);
  };

  // ── Post to all enabled platforms ─────────────────────────────
  const handlePostAll = async () => {
    const enabled = PLATFORMS.filter(p => configs[p.id].enabled);
    if (enabled.length === 0) return;

    setPosting(true);
    const postResults: PostResult[] = [];

    for (const platform of enabled) {
      setPostStep(platform.id);
      const config = configs[platform.id];

      try {
        const res = await fetch('/api/social/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: platform.id,
            creationId: creation.id,
            caption: buildCaption(platform.id),
            videoUrl: creation.videoUrl,
            thumbnailUrl: creation.thumbnail,
            hashtags: config.hashtags,
            scheduled: config.scheduled,
            scheduledAt: config.scheduledAt,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          postResults.push({
            platform: platform.id,
            success: true,
            postUrl: data.postUrl,
          });
        } else {
          const err = await res.json().catch(() => ({ error: 'Request failed' }));
          postResults.push({
            platform: platform.id,
            success: false,
            error: err.error || 'Failed to post',
          });
        }
      } catch (err: any) {
        postResults.push({
          platform: platform.id,
          success: false,
          error: err.message || 'Network error',
        });
      }
    }

    setResults(postResults);
    setPostStep(null);
    setPosting(false);
    onComplete(postResults);
  };

  // ── Computed ──────────────────────────────────────────────────
  const enabledCount = PLATFORMS.filter(p => configs[p.id].enabled).length;
  const connectedCount = PLATFORMS.filter(p => p.connected).length;

  // Done state
  if (results.length > 0) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return (
      <div className="space-y-4">
        <div className="text-center py-4">
          <div className="text-5xl mb-3">{failed.length === 0 ? '🚀' : '⚠️'}</div>
          <h3 className="font-display text-2xl text-white mb-1">
            {failed.length === 0 ? 'Posted Everywhere!' : 'Partially Posted'}
          </h3>
          <p className="text-sm text-muted">
            {successful.length}/{results.length} platforms succeeded
          </p>
        </div>

        <div className="space-y-2">
          {results.map(r => {
            const platform = PLATFORMS.find(p => p.id === r.platform)!;
            return (
              <div key={r.platform}
                className={`flex items-center gap-3 bg-bg2 border rounded-xl p-3 ${
                  r.success ? 'border-lime/30' : 'border-red-500/30'
                }`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: platform.color + '20' }}>
                  {platform.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{platform.name}</p>
                  {r.success ? (
                    r.postUrl ? (
                      <a href={r.postUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-cyan hover:underline">View post ↗</a>
                    ) : (
                      <p className="text-[10px] text-lime">✅ Posted successfully</p>
                    )
                  ) : (
                    <p className="text-[10px] text-red-400">❌ {r.error}</p>
                  )}
                </div>
                <span className={`text-sm ${r.success ? 'text-lime' : 'text-red-400'}`}>
                  {r.success ? '✓' : '✗'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg text-white flex items-center gap-2">
            📣 Auto-Post
            <span className="text-[10px] bg-cyan/10 text-cyan px-2 py-0.5 rounded-full font-mono">
              {enabledCount} active
            </span>
          </h3>
          <p className="text-xs text-muted">Share your creation across social platforms</p>
        </div>
        <button onClick={onSkip}
          className="text-xs text-muted hover:text-white transition">
          Skip →
        </button>
      </div>

      {/* Platform Cards */}
      <div className="space-y-3">
        {PLATFORMS.map(platform => {
          const config = configs[platform.id];
          const isExpanded = showAdvanced === platform.id;

          return (
            <div key={platform.id}
              className={`bg-bg2 border rounded-xl overflow-hidden transition-all ${
                config.enabled ? 'border-lime/30' : 'border-border'
              }`}>
              {/* Platform header */}
              <div className="flex items-center gap-3 p-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: platform.color + '20' }}>
                  {platform.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{platform.name}</h4>
                    {platform.connected ? (
                      <span className="text-[8px] bg-lime/10 text-lime px-1.5 py-0.5 rounded font-bold">CONNECTED</span>
                    ) : (
                      <button onClick={() => handleConnect(platform.id)}
                        disabled={connectingPlatform === platform.id}
                        className="text-[8px] bg-rip/10 text-rip px-1.5 py-0.5 rounded font-bold hover:bg-rip/20 transition">
                        {connectingPlatform === platform.id ? 'CONNECTING...' : 'CONNECT'}
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted">{platform.description}</p>
                </div>

                {/* Toggle */}
                <button onClick={() => togglePlatform(platform.id)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                    config.enabled ? 'bg-lime' : 'bg-bg3'
                  }`}>
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
                    config.enabled ? 'left-5' : 'left-0.5'
                  }`} />
                </button>
              </div>

              {/* Expanded config */}
              {config.enabled && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  {/* Caption */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[9px] text-muted uppercase">Caption</label>
                      <span className={`text-[9px] font-mono ${
                        buildCaption(platform.id).length > platform.maxCaptionLength * 0.9
                          ? 'text-red-400' : 'text-muted'
                      }`}>
                        {buildCaption(platform.id).length}/{platform.maxCaptionLength}
                      </span>
                    </div>
                    <textarea value={config.caption}
                      onChange={e => updateConfig(platform.id, { caption: e.target.value })}
                      rows={2}
                      className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-lime resize-none"
                      placeholder="Write a caption..." />
                  </div>

                  {/* Hashtags */}
                  <div>
                    <label className="text-[9px] text-muted uppercase mb-1 block">Hashtags</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {config.hashtags.map(tag => (
                        <span key={tag}
                          className="flex items-center gap-1 px-2 py-0.5 bg-cyan/10 text-cyan rounded text-[10px]">
                          #{tag}
                          <button onClick={() => removeHashtag(platform.id, tag)}
                            className="text-cyan/60 hover:text-red-400 text-[8px]">✕</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <input type="text" value={customHashtag}
                        onChange={e => setCustomHashtag(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addHashtag(platform.id)}
                        placeholder="Add hashtag..."
                        className="flex-1 bg-bg3 border border-border rounded px-2 py-1 text-[10px] text-white outline-none focus:border-cyan" />
                      <button onClick={() => addHashtag(platform.id)}
                        className="px-2 py-1 bg-bg3 border border-border rounded text-[10px] text-muted hover:text-white">+</button>
                    </div>
                  </div>

                  {/* Schedule toggle */}
                  {platform.supportsSchedule && (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted">⏰ Schedule for later</span>
                        <button onClick={() => updateConfig(platform.id, { scheduled: !config.scheduled })}
                          className={`w-8 h-4 rounded-full transition-colors relative ${
                            config.scheduled ? 'bg-cyan' : 'bg-bg3'
                          }`}>
                          <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${
                            config.scheduled ? 'left-4' : 'left-0.5'
                          }`} />
                        </button>
                      </div>
                      {config.scheduled && (
                        <input type="datetime-local"
                          value={config.scheduledAt || ''}
                          onChange={e => updateConfig(platform.id, { scheduledAt: e.target.value })}
                          min={new Date().toISOString().slice(0, 16)}
                          className="mt-2 w-full bg-bg3 border border-border rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan" />
                      )}
                    </div>
                  )}

                  {/* Format selector */}
                  <div className="flex gap-1.5">
                    {platform.formats.map((fmt, i) => (
                      <span key={fmt}
                        className={`px-2 py-1 rounded text-[9px] ${
                          i === 0 ? 'bg-lime/10 text-lime border border-lime/30' : 'bg-bg3 text-muted border border-border'
                        }`}>
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Post button */}
      <div className="space-y-2">
        <button onClick={handlePostAll}
          disabled={enabledCount === 0 || posting}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-black transition disabled:opacity-50"
          style={{ background: posting
            ? '#666'
            : enabledCount > 0
              ? 'linear-gradient(90deg, #00f2ea, #ff0050)'
              : '#333',
          }}>
          {posting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⟳</span>
              Posting to {PLATFORMS.find(p => p.id === postStep)?.name || '...'}
            </span>
          ) : (
            `📣 Post to ${enabledCount} Platform${enabledCount !== 1 ? 's' : ''}`
          )}
        </button>
        <button onClick={onSkip}
          className="w-full py-2.5 rounded-xl text-xs text-muted hover:text-white transition border border-border hover:border-rip/30">
          Skip — Publish Without Social Posts
        </button>
      </div>

      {/* Info */}
      <div className="bg-bg2 border border-border rounded-xl p-3">
        <p className="text-[10px] text-muted leading-relaxed">
          💡 Connect your social accounts in Settings to enable auto-posting. Posts are sent immediately or scheduled.
          Each platform may require its own OAuth login. Your credentials are stored securely and never shared.
        </p>
      </div>
    </div>
  );
}
