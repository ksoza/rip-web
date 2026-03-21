// lib/nft/helpers.ts
// Client-side helpers for NFT operations

import type { Chain, NFTMetadata, NFTAttribute, MintRequest, MintResult, NFTCollection, NFTItem } from './types';

// ── Metadata builder ────────────────────────────────────────────
export function buildMetadata(req: MintRequest, creatorAddress: string): NFTMetadata {
  return {
    name: req.title,
    description: req.description,
    image: req.thumbnail,
    animation_url: req.mediaUrl,
    external_url: `https://www.remixip.icu/watch/${encodeURIComponent(req.title.toLowerCase().replace(/\s+/g, '-'))}`,
    attributes: [
      { trait_type: 'Media Type', value: req.mediaType },
      { trait_type: 'Chain', value: req.chain },
      { trait_type: 'Platform', value: 'RiP' },
      ...req.attributes,
    ],
    properties: {
      category: req.mediaType === 'music' ? 'audio' : 'video',
      creators: [
        {
          address: creatorAddress,
          share: 100, // Creator gets full share (platform takes separate fee)
        },
      ],
      files: [
        { uri: req.thumbnail, type: 'image/png' },
        ...(req.mediaUrl ? [{ uri: req.mediaUrl, type: guessMediaMime(req.mediaType) }] : []),
      ],
    },
  };
}

// ── Royalty helpers ──────────────────────────────────────────────
export function percentToBps(percent: number): number {
  return Math.round(Math.max(0, Math.min(15, percent)) * 100);
}

export function bpsToPercent(bps: number): number {
  return bps / 100;
}

// XRPL uses transfer fee out of 50,000
export function percentToXrplFee(percent: number): number {
  return Math.round(Math.max(0, Math.min(50, percent)) * 1000);
}

// ── Symbol generator ────────────────────────────────────────────
export function generateSymbol(showName: string): string {
  const words = showName.trim().split(/\s+/);
  if (words.length === 1) {
    return 'RIP-' + words[0].slice(0, 4).toUpperCase();
  }
  const initials = words.map(w => w[0]).join('').toUpperCase();
  return 'RIP-' + initials.slice(0, 4);
}

// ── Explorer URLs ───────────────────────────────────────────────
export function getExplorerUrl(chain: Chain, txHash: string): string {
  switch (chain) {
    case 'solana':
      return `https://solscan.io/tx/${txHash}`;
    case 'xrpl':
      return `https://xrpscan.com/tx/${txHash}`;
    default:
      return '#';
  }
}

export function getMintExplorerUrl(chain: Chain, address: string): string {
  switch (chain) {
    case 'solana':
      return `https://solscan.io/token/${address}`;
    case 'xrpl':
      return `https://xrpscan.com/nft/${address}`;
    default:
      return '#';
  }
}

// ── MIME type guesser ───────────────────────────────────────────
function guessMediaMime(mediaType: string): string {
  switch (mediaType) {
    case 'episode':
    case 'scene':
      return 'video/mp4';
    case 'music':
      return 'audio/mpeg';
    case 'poster':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}

// ── Format helpers ──────────────────────────────────────────────
export function formatPrice(price: number, chain: Chain): string {
  if (chain === 'solana') return `${price.toFixed(2)} SOL`;
  if (chain === 'xrpl') return `${price.toFixed(2)} XRP`;
  return `${price.toFixed(2)}`;
}

export function chainLabel(chain: Chain): string {
  return chain === 'solana' ? '◎ Solana' : '✕ XRPL';
}

export function chainColor(chain: Chain): string {
  return chain === 'solana' ? '#9945FF' : '#00d4ff';
}

// ── Sample data for display ─────────────────────────────────────
export const SAMPLE_COLLECTIONS: NFTCollection[] = [
  {
    id: 'col1',
    name: 'Breaking Bad: Alternate Endings',
    symbol: 'RIP-BB',
    description: 'AI-generated alternate endings for Breaking Bad. Each episode is a unique 1/1 NFT.',
    image: '',
    chain: 'solana',
    creatorAddress: 'DbnD8vxbNVrG9iL7oi83Zg8RGqxFLATGcW67oq2xD5Nj',
    royaltyBps: 500,
    items: [],
    totalMinted: 12,
    floorPrice: 0.5,
    verified: true,
  },
  {
    id: 'col2',
    name: 'Anime Crossover Battles',
    symbol: 'RIP-ACB',
    description: 'Epic anime crossover battle scenes. Naruto vs Goku, Luffy vs Ichigo, and more.',
    image: '',
    chain: 'xrpl',
    creatorAddress: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    royaltyBps: 750,
    items: [],
    totalMinted: 8,
    floorPrice: 25,
    verified: false,
  },
];
