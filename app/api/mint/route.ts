// app/api/mint/route.ts
// NFT metadata preparation and upload endpoint
// Actual minting happens client-side via wallet signing

import { NextRequest, NextResponse } from 'next/server';
import { recordNFTMint, logTransaction } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, metadata, chain } = body;

    // Action: prepare — validates and returns structured metadata
    if (action === 'prepare') {
      if (!metadata?.name || !metadata?.description || !metadata?.image) {
        return NextResponse.json({ error: 'Missing required fields: name, description, image' }, { status: 400 });
      }

      // Build Metaplex-compatible metadata JSON
      const nftMetadata = {
        name: metadata.name,
        symbol: 'RIP',
        description: metadata.description,
        image: metadata.image,
        animation_url: metadata.animation_url || null,
        external_url: `https://remixip.icu/nft/${Date.now()}`,
        seller_fee_basis_points: metadata.royaltyBps || 500,
        attributes: [
          { trait_type: 'Show', value: metadata.show || 'Original' },
          { trait_type: 'Genre', value: metadata.genre || 'Uncategorized' },
          { trait_type: 'Type', value: metadata.mediaType || 'scene' },
          { trait_type: 'Platform', value: 'RiP - Remix IP' },
          ...(metadata.season ? [{ trait_type: 'Season', value: metadata.season }] : []),
          ...(metadata.episode ? [{ trait_type: 'Episode', value: metadata.episode }] : []),
          ...(metadata.attributes || []),
        ],
        properties: {
          category: metadata.animation_url ? 'video' : 'image',
          creators: [
            { address: metadata.creatorAddress, share: 85 },
            // Platform fee — 15% of royalties go to RiP
            { address: process.env.FOUNDER_SOLANA_WALLET || '', share: 15 },
          ],
          files: [
            { uri: metadata.image, type: 'image/png' },
            ...(metadata.animation_url ? [{ uri: metadata.animation_url, type: 'video/mp4' }] : []),
          ],
        },
      };

      return NextResponse.json({
        success: true,
        metadata: nftMetadata,
        chain: chain || 'solana',
        // In production: upload to Arweave/IPFS and return URI
        metadataUri: `data:application/json;base64,${Buffer.from(JSON.stringify(nftMetadata)).toString('base64')}`,
      });
    }

    // Action: verify — check if an NFT was successfully minted on-chain
    if (action === 'verify') {
      const { txHash, chain: mintChain, userId, creationId, mintAddress, metadataUri } = body;
      if (!txHash) {
        return NextResponse.json({ error: 'Missing txHash' }, { status: 400 });
      }

      // Record the NFT in our database
      if (userId) {
        const nft = await recordNFTMint({
          creationId,
          ownerId: userId,
          mintAddress: mintAddress || txHash,
          metadataUri,
          royaltyBps: 500,
        });

        // Log the mint transaction
        await logTransaction({
          userId,
          type: 'nft_mint',
          solanaTxSig: txHash,
          metadata: { nftId: nft?.id, chain: mintChain, creationId },
        });
      }

      return NextResponse.json({
        success: true,
        verified: true,
        chain: mintChain,
        explorerUrl: mintChain === 'solana'
          ? `https://explorer.solana.com/tx/${txHash}`
          : `https://livenet.xrpl.org/transactions/${txHash}`,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (err: any) {
    console.error('Mint API error:', err);
    return NextResponse.json({ error: err.message || 'Mint failed' }, { status: 500 });
  }
}
