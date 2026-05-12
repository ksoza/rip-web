// lib/solana/metaplex-umi.ts
// Umi client factory + Phantom wallet signer for Metaplex NFT minting
// Works client-side with Phantom's injected window.solana provider

'use client';

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  generateSigner,
  percentAmount,
  publicKey,
  signerIdentity,
  type Umi,
  type Signer,
  type TransactionBuilder,
} from '@metaplex-foundation/umi';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import {
  fromWeb3JsPublicKey,
  toWeb3JsLegacyTransaction,
  fromWeb3JsLegacyTransaction,
} from '@metaplex-foundation/umi-web3js-adapters';
import { PublicKey as Web3PublicKey } from '@solana/web3.js';

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

// ── Create Umi Instance ─────────────────────────────────────────
let _umi: Umi | null = null;

export function getUmi(): Umi {
  if (_umi) return _umi;
  _umi = createUmi(SOLANA_RPC).use(mplTokenMetadata());
  return _umi;
}

// ── Phantom → Umi Signer Bridge ─────────────────────────────────
// Wraps Phantom's injected provider as a Umi Signer so Metaplex
// instructions can be signed transparently via Phantom popup.

function createPhantomSigner(umi: Umi): Signer {
  const provider = (window as any)?.solana;
  if (!provider?.isPhantom) {
    throw new Error('Phantom wallet not found');
  }
  if (!provider.publicKey) {
    throw new Error('Phantom not connected — call connect() first');
  }

  const pk = fromWeb3JsPublicKey(new Web3PublicKey(provider.publicKey.toString()));

  return {
    publicKey: pk,

    signTransaction: async (transaction: any) => {
      // Convert Umi tx → web3.js legacy tx → Phantom signs → convert back
      const web3Tx = toWeb3JsLegacyTransaction(transaction);
      const signedWeb3Tx = await provider.signTransaction(web3Tx);
      return fromWeb3JsLegacyTransaction(signedWeb3Tx);
    },

    signAllTransactions: async (transactions: any[]) => {
      const web3Txs = transactions.map(toWeb3JsLegacyTransaction);
      const signedWeb3Txs = await provider.signAllTransactions(web3Txs);
      return signedWeb3Txs.map(fromWeb3JsLegacyTransaction);
    },

    signMessage: async (message: Uint8Array) => {
      const { signature } = await provider.signMessage(message, 'utf8');
      return signature;
    },
  } as any;
}

// ── Helper: get connected Umi with Phantom ──────────────────────
export function getUmiWithPhantom(): { umi: Umi; signer: Signer } {
  const umi = getUmi();
  const signer = createPhantomSigner(umi);
  // Set Phantom as identity (signer) and payer
  umi.use(signerIdentity(signer));
  return { umi, signer };
}

export { percentAmount, publicKey, generateSigner };
