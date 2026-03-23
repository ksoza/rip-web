// lib/nft/mint.ts
// NFT minting helpers for Solana (Metaplex) and XRPL
// Client-side mint orchestration — actual signing happens in the wallet

import type {
  Chain, MintConfig, MintResult, NFTMetadata, SolanaMintConfig, XRPLMintConfig,
} from './types';

// ── Metadata Upload ─────────────────────────────────────────────
// In production: upload to Arweave (Solana) or IPFS
// For now: uses a simple JSON blob approach

export function buildMetadataJson(meta: NFTMetadata): string {
  return JSON.stringify({
    name: meta.name,
    symbol: 'RIP',
    description: meta.description,
    image: meta.image,
    animation_url: meta.animation_url,
    external_url: meta.external_url || `https://remixip.icu/nft`,
    seller_fee_basis_points: meta.royalties.sellerFeeBasisPoints,
    attributes: [
      { trait_type: 'Show', value: meta.show },
      { trait_type: 'Genre', value: meta.genre },
      { trait_type: 'Type', value: meta.mediaType },
      ...(meta.season ? [{ trait_type: 'Season', value: meta.season }] : []),
      ...(meta.episode ? [{ trait_type: 'Episode', value: meta.episode }] : []),
      ...meta.attributes,
    ],
    properties: {
      category: meta.animation_url ? 'video' : 'image',
      creators: meta.royalties.creators.map(c => ({
        address: c.address,
        share: c.share,
      })),
      files: [
        { uri: meta.image, type: 'image/png' },
        ...(meta.animation_url ? [{ uri: meta.animation_url, type: 'video/mp4' }] : []),
      ],
    },
  }, null, 2);
}

// ── Solana Mint Instructions ────────────────────────────────────
// Returns transaction instructions for Metaplex NFT creation
// Actual signing is done client-side via Phantom wallet

export function buildSolanaMintInstruction(config: SolanaMintConfig) {
  return {
    // These would be Metaplex CreateNft instructions
    // Client-side code will use @metaplex-foundation/js SDK
    type: 'metaplex_create_nft' as const,
    params: {
      name: config.metadata.name,
      symbol: 'RIP',
      uri: '', // Will be set after metadata upload
      sellerFeeBasisPoints: config.metadata.royalties.sellerFeeBasisPoints,
      creators: config.metadata.royalties.creators.map(c => ({
        address: c.address,
        share: c.share,
        verified: false,
      })),
      collection: config.collection ? { key: config.collection, verified: false } : undefined,
      isMutable: config.isMutable,
      maxSupply: config.maxSupply ?? 0,
    },
  };
}

// ── XRPL Mint Instructions ──────────────────────────────────────
// Returns XRPL NFTokenMint transaction fields

export function buildXRPLMintInstruction(config: XRPLMintConfig) {
  // Convert metadata URI to hex for XRPL
  const uriHex = Buffer.from(config.metadata.external_url || '').toString('hex').toUpperCase();

  return {
    type: 'xrpl_nftoken_mint' as const,
    params: {
      TransactionType: 'NFTokenMint',
      NFTokenTaxon: config.taxon,
      Flags: config.flags,
      TransferFee: config.transferFee,
      URI: uriHex,
    },
  };
}

// ── Royalty Presets ──────────────────────────────────────────────
export const ROYALTY_PRESETS = [
  { label: 'Standard (5%)',   bps: 500,  description: 'Industry standard — 5% on every resale' },
  { label: 'Creator (7.5%)', bps: 750,  description: 'Premium creator rate — 7.5% on resale' },
  { label: 'Premium (10%)',  bps: 1000, description: 'Maximum earnings — 10% on every resale' },
  { label: 'Custom',         bps: 0,    description: 'Set your own royalty rate' },
];

// ── Chain Config ────────────────────────────────────────────────
export const CHAIN_CONFIG = {
  solana: {
    name: 'Solana',
    icon: '◎',
    color: '#9945FF',
    explorer: 'https://explorer.solana.com',
    currency: 'SOL',
    mintFee: '~0.01 SOL',
    wallet: 'Phantom',
    features: ['Metaplex standard', 'Compressed NFTs', 'Collection grouping', 'Programmable royalties'],
  },
  xrpl: {
    name: 'XRPL',
    icon: '✕',
    color: '#00A3E0',
    explorer: 'https://xrpl.org',
    currency: 'XRP',
    mintFee: '~0.00001 XRP',
    wallet: 'XUMM',
    features: ['Native NFT support', 'No smart contract needed', 'Built-in transfer fees', 'DEX integration'],
  },
} as const;
