// app/api/nfts/route.ts
// NFT management — GET user's NFTs, POST record mint, PATCH list/delist
import { NextRequest, NextResponse } from 'next/server';
import { recordNFTMint, getUserNFTs, listNFTForSale } from '@/lib/db';
import { logTransaction } from '@/lib/db';

// GET /api/nfts — get authenticated user's NFTs
export async function GET(req: NextRequest) {
  try {
    // Use verified user from middleware (x-user-id header)
    const userId = req.headers.get('x-user-id')!;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nfts = await getUserNFTs(userId);
    return NextResponse.json({ nfts });
  } catch (err: any) {
    console.error('Get NFTs error:', err);
    return NextResponse.json({ error: 'Failed to fetch NFTs' }, { status: 500 });
  }
}

// POST /api/nfts — record a new mint (called after client-side wallet signing)
export async function POST(req: NextRequest) {
  try {
    // Use verified user from middleware (x-user-id header)
    const userId = req.headers.get('x-user-id')!;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creationId, mintAddress, metadataUri, maxEditions, royaltyBps, solanaTxSig } = await req.json();

    const nft = await recordNFTMint({
      creationId,
      ownerId: userId,
      mintAddress,
      metadataUri,
      maxEditions,
      royaltyBps,
    });

    if (nft) {
      // Log the mint transaction
      await logTransaction({
        userId,
        type: 'nft_mint',
        solanaTxSig,
        metadata: { nftId: nft.id, creationId, mintAddress },
      });
    }

    return NextResponse.json({ nft });
  } catch (err: any) {
    console.error('Record NFT mint error:', err);
    return NextResponse.json({ error: 'Failed to record NFT mint' }, { status: 500 });
  }
}

// PATCH /api/nfts — list or delist an NFT for sale
export async function PATCH(req: NextRequest) {
  try {
    // Use verified user from middleware (x-user-id header)
    const userId = req.headers.get('x-user-id')!;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nftId, action, priceSol } = await req.json();

    if (!nftId || !action) {
      return NextResponse.json({ error: 'nftId and action required' }, { status: 400 });
    }

    if (action === 'list') {
      if (!priceSol || priceSol <= 0) {
        return NextResponse.json({ error: 'Positive priceSol required for listing' }, { status: 400 });
      }
      const success = await listNFTForSale(nftId, userId, priceSol);
      return NextResponse.json({ listed: success });
    }

    if (action === 'delist') {
      const success = await listNFTForSale(nftId, userId, 0);
      return NextResponse.json({ delisted: success });
    }

    return NextResponse.json({ error: 'Invalid action. Use "list" or "delist"' }, { status: 400 });
  } catch (err: any) {
    console.error('NFT action error:', err);
    return NextResponse.json({ error: 'Failed to update NFT' }, { status: 500 });
  }
}
