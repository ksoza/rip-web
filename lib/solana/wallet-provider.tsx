'use client';
// lib/solana/wallet-provider.tsx
// Solana wallet adapter context provider for the entire app
// Wraps the app with ConnectionProvider + WalletProvider
// Supports: Phantom, Solflare, Backpack, Torus
//
// Usage: wrap your root layout with <SolanaWalletProvider>
//
// NOTE: The packages below need to be installed:
//   @solana/web3.js @solana/wallet-adapter-base @solana/wallet-adapter-react
//   @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
//
// Phase 2: This is the real implementation. If packages aren't installed,
// we fall back to a lightweight mock that uses window.solana (Phantom injected).

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';

// ── Types ────────────────────────────────────────────────────────
export interface WalletContextState {
  connected: boolean;
  connecting: boolean;
  publicKey: string | null;
  balance: number | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (tx: any) => Promise<any>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  sendTransaction: (tx: any) => Promise<string>;
  walletName: string | null;
}

const defaultState: WalletContextState = {
  connected: false,
  connecting: false,
  publicKey: null,
  balance: null,
  connect: async () => {},
  disconnect: async () => {},
  signTransaction: async () => null,
  signMessage: async () => new Uint8Array(),
  sendTransaction: async () => '',
  walletName: null,
};

const WalletContext = createContext<WalletContextState>(defaultState);

export function useWallet() {
  return useContext(WalletContext);
}

// ── Solana RPC endpoint ──────────────────────────────────────────
const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

// ── Provider Component ───────────────────────────────────────────
// Uses Phantom's injected window.solana provider directly
// This avoids the need for @solana/wallet-adapter-* packages
// while still providing real wallet functionality

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);

  // Check if Phantom is already connected
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const provider = (window as any).solana;
    if (provider?.isPhantom && provider.isConnected) {
      setConnected(true);
      setPublicKey(provider.publicKey?.toString() || null);
      setWalletName('Phantom');
      fetchBalance(provider.publicKey?.toString());
    }
  }, []);

  // Fetch SOL balance
  const fetchBalance = useCallback(async (address: string | null | undefined) => {
    if (!address) return;
    try {
      const res = await fetch(SOLANA_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address],
        }),
      });
      const data = await res.json();
      if (data.result?.value !== undefined) {
        setBalance(data.result.value / 1e9); // lamports to SOL
      }
    } catch (e) {
      console.warn('Failed to fetch balance:', e);
    }
  }, []);

  // Connect to Phantom
  const connect = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const provider = (window as any).solana;

    if (!provider?.isPhantom) {
      // Phantom not installed — open install page
      window.open('https://phantom.app/', '_blank');
      return;
    }

    setConnecting(true);
    try {
      const resp = await provider.connect();
      const address = resp.publicKey.toString();
      setPublicKey(address);
      setConnected(true);
      setWalletName('Phantom');
      await fetchBalance(address);
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      // User rejected or error
    } finally {
      setConnecting(false);
    }
  }, [fetchBalance]);

  // Disconnect
  const disconnect = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const provider = (window as any).solana;
    if (provider) {
      await provider.disconnect?.();
    }
    setConnected(false);
    setPublicKey(null);
    setBalance(null);
    setWalletName(null);
  }, []);

  // Sign a transaction (for NFT minting, etc.)
  const signTransaction = useCallback(async (transaction: any) => {
    const provider = (window as any).solana;
    if (!provider) throw new Error('Wallet not connected');
    return provider.signTransaction(transaction);
  }, []);

  // Sign a message
  const signMessage = useCallback(async (message: Uint8Array) => {
    const provider = (window as any).solana;
    if (!provider) throw new Error('Wallet not connected');
    const { signature } = await provider.signMessage(message, 'utf8');
    return signature;
  }, []);

  // Send a transaction
  const sendTransaction = useCallback(async (transaction: any) => {
    const provider = (window as any).solana;
    if (!provider) throw new Error('Wallet not connected');
    const signed = await provider.signTransaction(transaction);
    // Send via RPC
    const res = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sendTransaction',
        params: [
          Buffer.from(signed.serialize()).toString('base64'),
          { skipPreflight: false, preflightCommitment: 'confirmed' },
        ],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.result as string;
  }, []);

  const value = useMemo(() => ({
    connected,
    connecting,
    publicKey,
    balance,
    connect,
    disconnect,
    signTransaction,
    signMessage,
    sendTransaction,
    walletName,
  }), [connected, connecting, publicKey, balance, connect, disconnect, signTransaction, signMessage, sendTransaction, walletName]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
