// app/api/mint/route.ts
// NFT metadata upload (to S3), preparation, and verification endpoint
// Actual minting happens client-side via Metaplex + Phantom wallet

import { NextRequest, NextResponse } from 'next/server';
import { recordNFTMint, logTransaction } from '@/lib/db';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ── S3 Client (reuse existing Bedrock credentials) ──────────────
function getS3() {
  return new S3Client({
    region: process.env.BEDROCK_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.BEDROCK_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.BEDROCK_SECRET_ACCESS_KEY || '',
    },
  });
}

const NFT_BUCKET = process.env.BEDROCK_VIDEO_BUCKET || 'rip-web-video-output';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── Action: upload — upload metadata JSON to S3 and return URI ──
    if (action === 'upload') {
      const { metadata } = body;
      if (!metadata?.name || !metadata?.description || !metadata?.image) {
        return NextResponse.json(
          { error: 'Missing required fields: name, description, image' },
          { status: 400 },
        );
      }

      // Generate a unique key for this metadata
      const ts = Date.now();
      const slug = metadata.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 40);
      const key = `nft-metadata/${ts}-${slug}.json`;

      const s3 = getS3();
      await s3.send(
        new PutObjectCommand({
          Bucket: NFT_BUCKET,
          Key: key,
          Body: JSON.stringify(metadata, null, 2),
          ContentType: 'application/json',
          // Public read via bucket policy on nft-metadata/* prefix
        }),
      );

      const metadataUri = `https://${NFT_BUCKET}.s3.amazonaws.com/${key}`;

      return NextResponse.json({ success: true, metadataUri });
    }

    // ── Action: prepare — validate and return structured metadata ──
    if (action === 'prepare') {
      const { metadata, chain } = body;
      if (!metadata?.name || !metadata?.description || !metadata?.image) {
        return NextResponse.json(
          { error: 'Missing required fields: name, description, image' },
          { status: 400 },
        );
      }

      const nftMetadata = {
        name: metadata.name,
        symbol: 'RIP',
        description: metadata.description,
        image: metadata.image,
        animation_url: metadata.animation_url || null,
        external_url: `https://www.remixip.icu`,
        seller_fee_basis_points: metadata.royaltyBps || 500,
        attributes: [
          { trait_type: 'Show', value: metadata.show || 'Original' },
          { trait_type: 'Genre', value: metadata.genre || 'Uncategorized' },
          { trait_type: 'Type', value: metadata.mediaType || 'scene' },
          { trait_type: 'Platform', value: 'RiP — Remix IP' },
          ...(metadata.season ? [{ trait_type: 'Season', value: metadata.season }] : []),
          ...(metadata.episode ? [{ trait_type: 'Episode', value: metadata.episode }] : []),
          ...(metadata.attributes || []),
        ],
        properties: {
          category: metadata.animation_url ? 'video' : 'image',
          creators: [
            { address: metadata.creatorAddress, share: 85 },
            { address: process.env.FOUNDER_SOLANA_WALLET || '', share: 15 },
          ],
          files: [
            { uri: metadata.image, type: 'image/png' },
            ...(metadata.animation_url
              ? [{ uri: metadata.animation_url, type: 'video/mp4' }]
              : []),
          ],
        },
      };

      return NextResponse.json({
        success: true,
        metadata: nftMetadata,
        chain: chain || 'solana',
        metadataUri: `data:application/json;base64,${Buffer.from(
          JSON.stringify(nftMetadata),
        ).toString('base64')}`,
      });
    }

    // ── Action: verify — record a confirmed on-chain mint ──────────
    if (action === 'verify') {
      const { txHash, chain: mintChain, creationId, mintAddress, metadataUri, userId } = body;
      const headerUserId = req.headers.get('x-user-id');
      const uid = userId || headerUserId;

      if (!txHash) {
        return NextResponse.json({ error: 'Missing txHash' }, { status: 400 });
      }

      if (uid) {
        const nft = await recordNFTMint({
          creationId,
          ownerId: uid,
          mintAddress: mintAddress || txHash,
          metadataUri,
          royaltyBps: 500,
        });

        await logTransaction({
          userId: uid,
          type: 'nft_mint',
          solanaTxSig: txHash,
          metadata: { nftId: nft?.id, chain: mintChain, creationId },
        });
      }

      return NextResponse.json({
        success: true,
        verified: true,
        chain: mintChain,
        explorerUrl:
          mintChain === 'solana'
            ? `https://solscan.io/token/${mintAddress}`
            : `https://livenet.xrpl.org/transactions/${txHash}`,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Mint API error:', err);
    return NextResponse.json(
      { error: err.message || 'Mint failed' },
      { status: 500 },
    );
  }
}
