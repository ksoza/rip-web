'use client';
// components/shared/ShareDialog.tsx
// Reusable social sharing dialog for creations, profiles, and referrals
// Supports: Twitter/X, Facebook, Reddit, copy link, native share API

import { useState, useCallback } from 'react';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  url: string;
  image?: string;
  type?: 'creation' | 'profile' | 'referral';
}

const SHARE_PLATFORMS = [
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: '𝕏',
    color: '#000',
    getUrl: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}&hashtags=RiP,RemixIP,AI`,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'f',
    color: '#1877F2',
    getUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: '⬆',
    color: '#FF4500',
    getUrl: (url: string, text: string) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈',
    color: '#0088cc',
    getUrl: (url: string, text: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '💬',
    color: '#25D366',
    getUrl: (url: string, text: string) =>
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`,
  },
];

export function ShareDialog({ isOpen, onClose, title, description, url, image, type = 'creation' }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  const shareText = type === 'referral'
    ? `Join me on RiP — the AI Fan Studio! Create remixed content for any show. ${title}`
    : `Check out "${title}" on RiP — AI Fan Studio`;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [url]);

  const handleEmbedCopy = useCallback(async () => {
    const embedCode = `<iframe src="${url}?embed=true" width="560" height="315" frameborder="0" allowfullscreen></iframe>`;
    await navigator.clipboard.writeText(embedCode);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  }, [url]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || shareText,
          url,
        });
      } catch (e) {
        // User cancelled — ignore
      }
    }
  }, [title, description, shareText, url]);

  const handlePlatformClick = useCallback((platform: typeof SHARE_PLATFORMS[0]) => {
    const shareUrl = platform.getUrl(url, shareText);
    window.open(shareUrl, '_blank', 'width=600,height=400');
  }, [url, shareText]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg2 border border-border rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl text-white">Share</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-bg3 flex items-center justify-center text-muted hover:text-white transition">
            ✕
          </button>
        </div>

        {/* Preview card */}
        <div className="bg-bg3 border border-bord2 rounded-xl p-4 mb-5">
          <div className="flex gap-3">
            {image && (
              <div className="w-16 h-16 rounded-lg bg-bg overflow-hidden flex-shrink-0">
                <img src={image} alt={title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{title}</p>
              {description && <p className="text-xs text-muted line-clamp-2 mt-0.5">{description}</p>}
              <p className="text-[10px] text-cyan mt-1 truncate">{url}</p>
            </div>
          </div>
        </div>

        {/* Social platforms */}
        <div className="grid grid-cols-5 gap-2 mb-5">
          {SHARE_PLATFORMS.map(platform => (
            <button key={platform.id} onClick={() => handlePlatformClick(platform)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-bg3 hover:bg-bg border border-border hover:border-bord2 transition group">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white transition-transform group-hover:scale-110"
                style={{ backgroundColor: platform.color }}>
                {platform.icon}
              </div>
              <span className="text-[9px] text-muted">{platform.name}</span>
            </button>
          ))}
        </div>

        {/* Copy link */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-bg3 border border-border rounded-lg px-3 py-2 text-xs text-muted font-mono truncate">
            {url}
          </div>
          <button onClick={handleCopy}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              copied ? 'bg-lime text-black' : 'bg-rip text-white hover:brightness-110'
            }`}>
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>

        {/* Embed code (for creations only) */}
        {type === 'creation' && (
          <button onClick={handleEmbedCopy}
            className="w-full py-2 text-xs text-muted hover:text-cyan transition text-center">
            {embedCopied ? '✓ Embed code copied!' : '📋 Copy embed code'}
          </button>
        )}

        {/* Native share (mobile) */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button onClick={handleNativeShare}
            className="w-full py-3 mt-2 rounded-xl bg-bg3 border border-border text-sm font-bold text-white hover:border-bord2 transition">
            📤 More sharing options...
          </button>
        )}
      </div>
    </div>
  );
}
