// lib/nft/types.ts
// NFT type definitions for Solana (Metaplex) and XRPL minting

export type Chain = 'solana' | 'xrpl';

export type NFTMediaType = 'episode' | 'scene' | 'movie' | 'music' | 'collection';

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;            // Thumbnail / cover art URL
  animation_url?: string;   // Video/audio URL
  external_url?: string;    // Link back to RiP platform

  attributes: NFTAttribute[];

  // RiP-specific
  show: string;
  genre: string;
  episode?: number;
  season?: number;
  mediaType: NFTMediaType;
  duration?: number;        // seconds

  // Creator info
  creator: {
    handle: string;
    address: string;        // Wallet address
  };

  // Royalty config
  royalties: RoyaltyConfig;
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

export interface RoyaltyConfig {
  // Percentage of resale price (basis points, 100 = 1%)
  sellerFeeBasisPoints: number;
  creators: RoyaltyShare[];
}

export interface RoyaltyShare {
  address: string;
  share: number;   // 0-100 (percentage of royalty)
}

// ── Solana / Metaplex Types ─────────────────────────────────────
export interface SolanaMintConfig {
  chain: 'solana';
  network: 'mainnet-beta' | 'devnet';
  metadata: NFTMetadata;
  collection?: string;      // Collection mint address
  maxSupply?: number;       // 0 = unlimited, 1 = 1/1
  isMutable: boolean;
}

// ── XRPL Types ──────────────────────────────────────────────────
export interface XRPLMintConfig {
  chain: 'xrpl';
  network: 'mainnet' | 'testnet';
  metadata: NFTMetadata;
  transferFee: number;      // 0-50000 (basis points, max 50%)
  flags: number;            // NFToken flags
  taxon: number;            // Collection grouping
}

// ── Unified Mint Request ────────────────────────────────────────
export type MintConfig = SolanaMintConfig | XRPLMintConfig;

// ── Mint Result ─────────────────────────────────────────────────
export interface MintResult {
  success: boolean;
  chain: Chain;
  txHash?: string;
  mintAddress?: string;     // Solana: mint pubkey / XRPL: NFTokenID
  error?: string;
  explorerUrl?: string;
}

// ── Collection ──────────────────────────────────────────────────
export interface NFTCollection {
  id: string;
  name: string;
  description: string;
  image: string;
  chain: Chain;
  address: string;          // On-chain collection address
  creator: string;
  itemCount: number;
  floorPrice?: number;
  totalVolume?: number;
}
