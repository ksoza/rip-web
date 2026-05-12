// lib/solana/metaplex-mint.ts
// Real on-chain NFT minting via Metaplex Token Metadata + Phantom wallet
//
// Flow:
// 1. Upload metadata JSON to /api/mint (action: upload) → S3 URI
// 2. Create NFT on-chain via Metaplex Umi + Phantom signer
// 3. Record mint in DB via /api/mint (action: verify)

'use client';

import { createNft } from '@metaplex-foundation/mpl-token-metadata';
import {
  getUmiWithPhantom,
  generateSigner,
  percentAmount,
  publicKey,
} from './metaplex-umi';

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const FOUNDER_WALLET = process.env.NEXT_PUBLIC_FOUNDER_WALLET || 'DbnD8vxbNVrG9iL7oi83Zg8RGqxFLATGcW67oq2xD5Nj';

// ── Types ────────────────────────────────────────────────────────
export interface MintInput {
  title: string;
  description: string;
  image: string;           // URL to cover image
  animationUrl?: string;   // URL to video/audio
  show?: string;
  genre?: string;
  mediaType?: string;
  royaltyBps?: number;     // default 500 = 5%
  creatorAddress: string;  // User's wallet address
  userId: string;
  creationId?: string;
  maxSupply?: number;      // 0 = unlimited, 1 = 1/1, >1 = limited
}

export interface MintResult {
  success: boolean;
  mintAddress?: string;
  txHash?: string;
  metadataUri?: string;
  explorerUrl?: string;
  error?: string;
}

// ── Step 1: Upload metadata to S3 via server ─────────────────────
async function uploadMetadata(input: MintInput): Promise<string> {
  const res = await fetch('/api/mint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'upload',
      metadata: {
        name: input.title,
        symbol: 'RIP',
        description: input.description,
        image: input.image,
        animation_url: input.animationUrl || null,
        external_url: `https://www.remixip.icu`,
        seller_fee_basis_points: input.royaltyBps || 500,
        attributes: [
          { trait_type: 'Show', value: input.show || 'Original' },
          { trait_type: 'Genre', value: input.genre || 'Uncategorized' },
          { trait_type: 'Type', value: input.mediaType || 'scene' },
          { trait_type: 'Platform', value: 'RiP — Remix IP' },
        ],
        properties: {
          category: input.animationUrl ? 'video' : 'image',
          creators: [
            { address: input.creatorAddress, share: 85 },
            { address: FOUNDER_WALLET, share: 15 },
          ],
          files: [
            { uri: input.image, type: 'image/png' },
            ...(input.animationUrl
              ? [{ uri: input.animationUrl, type: 'video/mp4' }]
              : []),
          ],
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Failed to upload NFT metadata');
  }

  const { metadataUri } = await res.json();
  return metadataUri;
}

// ── Step 2: Mint NFT on-chain via Metaplex ───────────────────────
export async function mintNFT(input: MintInput): Promise<MintResult> {
  try {
    // Check Phantom is available and connected
    const provider = (window as any)?.solana;
    if (!provider?.isPhantom) {
      return { success: false, error: 'Phantom wallet not found. Please install Phantom.' };
    }
    if (!provider.isConnected) {
      await provider.connect();
    }

    // 1. Upload metadata to S3
    const metadataUri = await uploadMetadata(input);

    // 2. Set up Umi with Phantom
    const { umi, signer } = getUmiWithPhantom();

    // 3. Generate a new mint keypair for this NFT
    const mint = generateSigner(umi);

    // 4. Build creator array
    const creators = [
      {
        address: publicKey(input.creatorAddress),
        verified: true,   // Will be verified since identity is the creator
        share: 85,
      },
      {
        address: publicKey(FOUNDER_WALLET),
        verified: false,  // Platform share — verified separately
        share: 15,
      },
    ];

    // 5. Create the NFT on-chain
    const txResult = await createNft(umi, {
      mint,
      name: input.title.slice(0, 32),  // Metaplex 32-char limit
      symbol: 'RIP',
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(
        (input.royaltyBps || 500) / 100, // Convert bps to percentage
        2,
      ),
      creators,
      isMutable: true,
    }).sendAndConfirm(umi);

    const mintAddress = mint.publicKey.toString();
    const txSig = Buffer.from(txResult.signature).toString('base64');

    // 6. Record in backend database
    await fetch('/api/mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify',
        txHash: txSig,
        chain: 'solana',
        userId: input.userId,
        creationId: input.creationId,
        mintAddress,
        metadataUri,
      }),
    });

    return {
      success: true,
      mintAddress,
      txHash: txSig,
      metadataUri,
      explorerUrl: `https://solscan.io/token/${mintAddress}`,
    };

  } catch (err: any) {
    console.error('Mint failed:', err);
    return {
      success: false,
      error: err.message || 'Minting failed',
    };
  }
}

// ── Prepare metadata (legacy compat) ─────────────────────────────
export async function prepareMint(input: MintInput): Promise<{
  metadata: any;
  metadataUri: string;
  chain: string;
}> {
  const res = await fetch('/api/mint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'prepare',
      chain: 'solana',
      metadata: {
        name: input.title,
        description: input.description,
        image: input.image,
        animation_url: input.animationUrl,
        show: input.show,
        genre: input.genre,
        mediaType: input.mediaType,
        royaltyBps: input.royaltyBps || 500,
        creatorAddress: input.creatorAddress,
        attributes: [],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to prepare mint');
  }
  return res.json();
}

// ── Helper: Get SOL balance ──────────────────────────────────────
export async function getSolBalance(address: string): Promise<number> {
  const res = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'getBalance',
      params: [address],
    }),
  });
  const data = await res.json();
  return (data.result?.value || 0) / 1e9;
}

// ── Helper: Get SPL token balances ───────────────────────────────
export async function getTokenBalances(address: string): Promise<Array<{
  mint: string; amount: number; decimals: number;
}>> {
  const res = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'getTokenAccountsByOwner',
      params: [
        address,
        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
        { encoding: 'jsonParsed' },
      ],
    }),
  });
  const data = await res.json();
  return (data.result?.value || []).map((a: any) => ({
    mint: a.account.data.parsed.info.mint,
    amount: a.account.data.parsed.info.tokenAmount.uiAmount,
    decimals: a.account.data.parsed.info.tokenAmount.decimals,
  }));
}
