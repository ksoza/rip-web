'use client';
// components/community/DiscordHub.tsx
// Discord community hub — shows server info, channels, live feed, join flow
// Embedded in the app so users can interact with the ReMiX IP Discord community
// without leaving the platform
import { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';

// ── Types ───────────────────────────────────────────────────────
interface DiscordHubProps {
  user: User;
}

interface DiscordChannel {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'text' | 'voice' | 'announcement' | 'stage' | 'forum';
  category: string;
  unread?: number;
}

interface DiscordMessage {
  id: string;
  author: { name: string; avatar?: string; badge?: string };
  content: string;
  timestamp: string;
  channel: string;
  attachments?: { url: string; type: 'image' | 'video' }[];
  reactions?: { emoji: string; count: number }[];
}

interface ServerStats {
  memberCount: number;
  onlineCount: number;
  boostLevel: number;
  creationCount: number;
}

// ── Channel Structure (ReMiX IP Server) ─────────────────────────
const SERVER_CHANNELS: DiscordChannel[] = [
  // 📢 Info
  { id: 'welcome', name: 'welcome', icon: '👋', description: 'Start here — rules & links', type: 'text', category: 'Info' },
  { id: 'announcements', name: 'announcements', icon: '📢', description: 'Official updates & drops', type: 'announcement', category: 'Info' },
  { id: 'roadmap', name: 'roadmap', icon: '🗺', description: 'Development progress', type: 'text', category: 'Info' },

  // 🎨 Create
  { id: 'showcase', name: 'showcase', icon: '🎬', description: 'Share your creations', type: 'text', category: 'Create' },
  { id: 'work-in-progress', name: 'work-in-progress', icon: '🛠', description: 'Share WIPs & get feedback', type: 'text', category: 'Create' },
  { id: 'tutorials', name: 'tutorials', icon: '📚', description: 'Tips & tutorials', type: 'text', category: 'Create' },
  { id: 'prompt-lab', name: 'prompt-lab', icon: '🧪', description: 'AI prompt sharing & experiments', type: 'forum', category: 'Create' },

  // 💰 $RiP Economy
  { id: 'nft-drops', name: 'nft-drops', icon: '🖼', description: 'NFT mints & drops', type: 'text', category: '$RiP Economy' },
  { id: 'staking', name: 'staking', icon: '💎', description: 'Staking pools & rewards', type: 'text', category: '$RiP Economy' },
  { id: 'trading', name: 'trading', icon: '📈', description: '$RiP token discussion', type: 'text', category: '$RiP Economy' },

  // 💬 Community
  { id: 'general', name: 'general', icon: '💬', description: 'General chat', type: 'text', category: 'Community' },
  { id: 'memes', name: 'memes', icon: '😂', description: 'Memes & vibes', type: 'text', category: 'Community' },
  { id: 'support', name: 'support', icon: '🆘', description: 'Get help', type: 'text', category: 'Community' },
  { id: 'suggestions', name: 'suggestions', icon: '💡', description: 'Feature requests & ideas', type: 'forum', category: 'Community' },

  // 🎙 Voice
  { id: 'lounge', name: 'lounge', icon: '🔊', description: 'Hang out', type: 'voice', category: 'Voice' },
  { id: 'studio-session', name: 'studio-session', icon: '🎙', description: 'Live creation sessions', type: 'stage', category: 'Voice' },
];

// ── Roles ───────────────────────────────────────────────────────
const SERVER_ROLES = [
  { name: 'Founder', color: '#FFD700', icon: '👑', description: 'Platform founder' },
  { name: 'OG ReMiXr', color: '#FF6B6B', icon: '🔥', description: 'Early adopter (first 100)' },
  { name: 'ReMiXr', color: '#00f2ea', icon: '🎨', description: 'Active creator' },
  { name: 'Collector', color: '#A855F7', icon: '💎', description: 'Holds 5+ NFTs' },
  { name: 'Staker', color: '#22C55E', icon: '🏦', description: 'Active $RiP staker' },
  { name: 'Mod', color: '#3B82F6', icon: '🛡', description: 'Community moderator' },
  { name: 'Bot', color: '#5865F2', icon: '🤖', description: 'Server bots' },
];

// ── Component ───────────────────────────────────────────────────
export function DiscordHub({ user }: DiscordHubProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'channels' | 'feed' | 'events'>('overview');
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<DiscordMessage[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [joined, setJoined] = useState(false);
  const [stats, setStats] = useState<ServerStats>({
    memberCount: 0, onlineCount: 0, boostLevel: 0, creationCount: 0,
  });
  const [events, setEvents] = useState<Array<{
    id: string; title: string; date: string; type: string; description: string;
  }>>([]);

  const INVITE_URL = 'https://discord.gg/remixip';
  const GUILD_ID = '1490454432645775401';

  // Fetch server stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/social/discord/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          setJoined(data.userJoined);
        }
      } catch {
        // Use placeholder stats
        setStats({ memberCount: 47, onlineCount: 12, boostLevel: 1, creationCount: 234 });
      }
    };
    fetchStats();
  }, []);

  // Fetch feed
  const fetchFeed = useCallback(async (channelId?: string) => {
    setLoadingFeed(true);
    try {
      const res = await fetch(`/api/social/discord/feed${channelId ? `?channel=${channelId}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // Placeholder messages
      setMessages([
        {
          id: '1', author: { name: 'RiP Bot', badge: 'BOT' },
          content: '🎬 New creation dropped by @creator123 — check it out!',
          timestamp: new Date().toISOString(), channel: 'showcase',
          reactions: [{ emoji: '🔥', count: 5 }, { emoji: '❤️', count: 3 }],
        },
        {
          id: '2', author: { name: 'xKreator', avatar: '/default-avatar.png' },
          content: 'Just minted my first NFT on the platform! The mint-on-publish flow is smooth 💎',
          timestamp: new Date(Date.now() - 3600000).toISOString(), channel: 'general',
          reactions: [{ emoji: '🙌', count: 7 }],
        },
        {
          id: '3', author: { name: 'ReMiXr_OG', avatar: '/default-avatar.png' },
          content: 'Who else staking $RiP? The APY on the 3-month lock is insane 📈',
          timestamp: new Date(Date.now() - 7200000).toISOString(), channel: 'staking',
          reactions: [{ emoji: '💎', count: 4 }, { emoji: '🚀', count: 2 }],
        },
      ]);
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'feed') fetchFeed(selectedChannel || undefined);
  }, [activeTab, selectedChannel, fetchFeed]);

  // Group channels by category
  const channelsByCategory = SERVER_CHANNELS.reduce((acc, ch) => {
    if (!acc[ch.category]) acc[ch.category] = [];
    acc[ch.category].push(ch);
    return acc;
  }, {} as Record<string, DiscordChannel[]>);

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  return (
    <div className="space-y-5">
      {/* Server Banner */}
      <div className="relative bg-gradient-to-r from-[#5865F2] via-[#7B68EE] to-[#00f2ea] rounded-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/rip-logo.png')] bg-center bg-no-repeat opacity-5 bg-[length:200px]" />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-black/30 backdrop-blur border border-white/20 flex items-center justify-center">
            <img src="/rip-logo.png" alt="RiP" className="w-10 h-10" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-2xl text-white font-bold">ReMiX I.P.</h2>
            <p className="text-sm text-white/70">AI Fan Studio • Create • Mint • Earn</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1 text-xs text-white/80">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                {stats.onlineCount} online
              </span>
              <span className="text-xs text-white/60">{stats.memberCount} members</span>
              {stats.boostLevel > 0 && (
                <span className="text-xs text-pink-300">✨ Level {stats.boostLevel}</span>
              )}
            </div>
          </div>
          {!joined && (
            <a href={INVITE_URL} target="_blank" rel="noopener noreferrer"
              className="px-5 py-2.5 bg-white text-[#5865F2] rounded-xl font-bold text-sm hover:bg-white/90 transition flex-shrink-0">
              Join Server
            </a>
          )}
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 bg-bg2 border border-border rounded-xl p-1">
        {(['overview', 'channels', 'feed', 'events'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === tab
                ? 'bg-[#5865F2] text-white'
                : 'text-muted hover:text-white'
            }`}>
            {tab === 'overview' ? '🏠 Overview' :
             tab === 'channels' ? '📋 Channels' :
             tab === 'feed' ? '💬 Feed' : '📅 Events'}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Members', value: stats.memberCount, icon: '👥' },
              { label: 'Online', value: stats.onlineCount, icon: '🟢' },
              { label: 'Creations', value: stats.creationCount, icon: '🎬' },
              { label: 'Boost', value: `Lv ${stats.boostLevel}`, icon: '✨' },
            ].map(s => (
              <div key={s.label} className="bg-bg2 border border-border rounded-xl p-3 text-center">
                <div className="text-lg">{s.icon}</div>
                <div className="text-lg font-bold text-white">{s.value}</div>
                <div className="text-[9px] text-muted">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Roles */}
          <div>
            <h4 className="text-xs font-bold text-muted uppercase mb-2">Roles</h4>
            <div className="flex flex-wrap gap-1.5">
              {SERVER_ROLES.map(role => (
                <span key={role.name}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border"
                  style={{
                    color: role.color,
                    borderColor: role.color + '40',
                    backgroundColor: role.color + '10',
                  }}>
                  {role.icon} {role.name}
                </span>
              ))}
            </div>
          </div>

          {/* Highlighted Channels */}
          <div>
            <h4 className="text-xs font-bold text-muted uppercase mb-2">Featured Channels</h4>
            <div className="grid grid-cols-2 gap-2">
              {SERVER_CHANNELS.filter(ch =>
                ['showcase', 'nft-drops', 'general', 'announcements'].includes(ch.id)
              ).map(ch => (
                <button key={ch.id}
                  onClick={() => { setSelectedChannel(ch.id); setActiveTab('feed'); }}
                  className="bg-bg2 border border-border rounded-xl p-3 text-left hover:border-[#5865F2]/40 transition">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{ch.icon}</span>
                    <span className="text-sm font-bold text-white">#{ch.name}</span>
                  </div>
                  <p className="text-[10px] text-muted">{ch.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Join CTA */}
          <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl p-4 text-center">
            <p className="text-sm text-white mb-2 font-bold">Join the community 🎉</p>
            <p className="text-xs text-muted mb-3">
              Connect with fellow ReMiXrs, share creations, get early access to drops, and earn $RiP rewards.
            </p>
            <a href={INVITE_URL} target="_blank" rel="noopener noreferrer"
              className="inline-block px-6 py-2.5 bg-[#5865F2] text-white rounded-xl font-bold text-sm hover:bg-[#4752C4] transition">
              🎮 Open Discord
            </a>
          </div>
        </div>
      )}

      {/* ── Channels Tab ─────────────────────────────────────── */}
      {activeTab === 'channels' && (
        <div className="space-y-4">
          {Object.entries(channelsByCategory).map(([category, channels]) => (
            <div key={category}>
              <h4 className="text-[10px] font-bold text-muted uppercase mb-1.5 px-1">
                {category}
              </h4>
              <div className="space-y-0.5">
                {channels.map(ch => (
                  <button key={ch.id}
                    onClick={() => { setSelectedChannel(ch.id); setActiveTab('feed'); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition group ${
                      selectedChannel === ch.id
                        ? 'bg-[#5865F2]/20 text-white'
                        : 'hover:bg-bg2 text-muted'
                    }`}>
                    <span className="text-base flex-shrink-0">
                      {ch.type === 'voice' ? '🔊' :
                       ch.type === 'stage' ? '🎙' :
                       ch.type === 'announcement' ? '📢' :
                       ch.type === 'forum' ? '💬' : '#'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {ch.name}
                      </p>
                      <p className="text-[9px] text-muted truncate">{ch.description}</p>
                    </div>
                    {ch.unread && ch.unread > 0 && (
                      <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                        {ch.unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Feed Tab ──────────────────────────────────────────── */}
      {activeTab === 'feed' && (
        <div className="space-y-3">
          {/* Channel filter */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            <button onClick={() => setSelectedChannel(null)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition ${
                !selectedChannel ? 'bg-[#5865F2] text-white' : 'bg-bg2 text-muted'
              }`}>
              All
            </button>
            {SERVER_CHANNELS.filter(c => c.type === 'text' || c.type === 'forum').map(ch => (
              <button key={ch.id}
                onClick={() => setSelectedChannel(ch.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition ${
                  selectedChannel === ch.id ? 'bg-[#5865F2] text-white' : 'bg-bg2 text-muted'
                }`}>
                {ch.icon} {ch.name}
              </button>
            ))}
          </div>

          {/* Messages */}
          {loadingFeed ? (
            <div className="text-center py-10">
              <div className="text-2xl animate-bounce mb-2">🎮</div>
              <p className="text-xs text-muted">Loading feed...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">🔇</div>
              <p className="text-sm text-white">No messages yet</p>
              <p className="text-xs text-muted">Be the first to say something!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages
                .filter(m => !selectedChannel || m.channel === selectedChannel)
                .map(msg => (
                <div key={msg.id} className="bg-bg2 border border-border rounded-xl p-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#5865F2]/20 flex items-center justify-center text-sm flex-shrink-0">
                      {msg.author.avatar
                        ? <img src={msg.author.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        : msg.author.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-white">{msg.author.name}</span>
                        {msg.author.badge && (
                          <span className="text-[7px] bg-[#5865F2] text-white px-1 py-0.5 rounded font-bold">
                            {msg.author.badge}
                          </span>
                        )}
                        <span className="text-[9px] text-muted">
                          #{msg.channel} · {timeAgo(msg.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 leading-relaxed">{msg.content}</p>

                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {msg.attachments.map((att, i) => (
                            <div key={i} className="w-32 h-20 rounded-lg overflow-hidden bg-bg3 border border-border">
                              {att.type === 'image'
                                ? <img src={att.url} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-lg">▶️</div>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {msg.reactions.map((r, i) => (
                            <span key={i}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 bg-bg3 border border-border rounded text-[10px]">
                              {r.emoji} <span className="text-white/60">{r.count}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Open in Discord CTA */}
          <a href={INVITE_URL} target="_blank" rel="noopener noreferrer"
            className="block text-center py-3 bg-bg2 border border-border rounded-xl text-xs text-[#5865F2] hover:text-white transition">
            Open full conversation in Discord ↗
          </a>
        </div>
      )}

      {/* ── Events Tab ───────────────────────────────────────── */}
      {activeTab === 'events' && (
        <div className="space-y-3">
          {/* Upcoming events */}
          <div className="bg-bg2 border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#5865F2] to-cyan rounded-xl flex items-center justify-center">
                <span className="text-xl">🎙</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Weekly Creator Showcase</p>
                <p className="text-[10px] text-muted">Every Friday 8pm EST · #studio-session</p>
                <p className="text-[10px] text-cyan mt-0.5">Share your latest creations live!</p>
              </div>
              <button className="px-3 py-1.5 bg-[#5865F2] rounded-lg text-[10px] text-white font-bold">
                Interested
              </button>
            </div>
          </div>

          <div className="bg-bg2 border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center">
                <span className="text-xl">🖼</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">NFT Drop Day</p>
                <p className="text-[10px] text-muted">1st of every month · #nft-drops</p>
                <p className="text-[10px] text-purple-400 mt-0.5">Featured creator mints + $RiP airdrops</p>
              </div>
              <button className="px-3 py-1.5 bg-[#5865F2] rounded-lg text-[10px] text-white font-bold">
                Interested
              </button>
            </div>
          </div>

          <div className="bg-bg2 border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🧪</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Prompt Battle</p>
                <p className="text-[10px] text-muted">Bi-weekly Wednesday · #prompt-lab</p>
                <p className="text-[10px] text-green-400 mt-0.5">AI prompt competition — winner gets 500 $RiP</p>
              </div>
              <button className="px-3 py-1.5 bg-[#5865F2] rounded-lg text-[10px] text-white font-bold">
                Interested
              </button>
            </div>
          </div>

          {/* Create event */}
          <div className="text-center py-4">
            <p className="text-xs text-muted mb-2">Want to host a community event?</p>
            <a href={`${INVITE_URL}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-[#5865F2] hover:text-white transition">
              Suggest in #suggestions ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
