// lib/db.ts
// Central database helpers — typed queries for all 6 new tables
// Tables: generations, transactions, staking_positions, nfts, comments, likes

import { createSupabaseAdmin } from './supabase';

// ── Types ───────────────────────────────────────────────────────

export interface Generation {
  id: string;
  user_id: string;
  creation_type: string;    // 'story' | 'image' | 'video' | 'audio' | 'sprite' | 'faceswap' | 'lipsync' | 'motion'
  model: string;
  prompt?: string;
  result?: Record<string, any>;
  tokens_used: number;
  duration_ms: number;
  success: boolean;
  error?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: string;             // 'subscription' | 'nft_mint' | 'staking' | 'reward' | 'rip_purchase' | 'payout'
  amount_usd?: number;
  amount_sol?: number;
  stripe_payment_id?: string;
  solana_tx_sig?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface StakingPosition {
  id: string;
  user_id: string;
  amount_sol: number;
  apy: number;
  staked_at: string;
  unlock_at: string;
  status: string;           // 'active' | 'unstaking' | 'completed'
  rewards_earned: number;
}

export interface NFT {
  id: string;
  creation_id?: string;
  owner_id: string;
  mint_address?: string;
  metadata_uri?: string;
  edition_number: number;
  max_editions: number;
  royalty_bps: number;
  listed_price_sol?: number;
  status: string;           // 'minted' | 'listed' | 'sold' | 'burned'
  minted_at: string;
}

export interface Comment {
  id: string;
  creation_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  edited: boolean;
  created_at: string;
  // Joined fields
  username?: string;
  avatar_url?: string;
}

export interface Like {
  user_id: string;
  creation_id: string;
  created_at: string;
}

// ── Generations ─────────────────────────────────────────────────

export async function logGeneration(data: {
  userId: string;
  creationType: string;
  model: string;
  prompt?: string;
  result?: Record<string, any>;
  tokensUsed?: number;
  durationMs?: number;
  success: boolean;
  error?: string;
}): Promise<Generation | null> {
  const supabase = createSupabaseAdmin();
  const { data: gen, error } = await supabase
    .from('generations')
    .insert({
      user_id: data.userId,
      creation_type: data.creationType,
      model: data.model,
      prompt: data.prompt,
      result: data.result || {},
      tokens_used: data.tokensUsed || 0,
      duration_ms: data.durationMs || 0,
      success: data.success,
      error: data.error || null,
    })
    .select()
    .single();
  
  if (error) console.error('logGeneration error:', error);
  return gen;
}

export async function getUserGenerations(userId: string, limit = 20): Promise<Generation[]> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ── Transactions ────────────────────────────────────────────────

export async function logTransaction(data: {
  userId: string;
  type: string;
  amountUsd?: number;
  amountSol?: number;
  stripePaymentId?: string;
  solanaTxSig?: string;
  metadata?: Record<string, any>;
}): Promise<Transaction | null> {
  const supabase = createSupabaseAdmin();
  const { data: tx, error } = await supabase
    .from('transactions')
    .insert({
      user_id: data.userId,
      type: data.type,
      amount_usd: data.amountUsd || null,
      amount_sol: data.amountSol || null,
      stripe_payment_id: data.stripePaymentId || null,
      solana_tx_sig: data.solanaTxSig || null,
      metadata: data.metadata || {},
    })
    .select()
    .single();
  
  if (error) console.error('logTransaction error:', error);
  return tx;
}

export async function getUserTransactions(userId: string, limit = 50): Promise<Transaction[]> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ── Staking ─────────────────────────────────────────────────────

export async function createStakingPosition(data: {
  userId: string;
  amountSol: number;
  apy: number;
  lockDays: number;
}): Promise<StakingPosition | null> {
  const supabase = createSupabaseAdmin();
  const unlockAt = new Date();
  unlockAt.setDate(unlockAt.getDate() + data.lockDays);
  
  const { data: position, error } = await supabase
    .from('staking_positions')
    .insert({
      user_id: data.userId,
      amount_sol: data.amountSol,
      apy: data.apy,
      unlock_at: unlockAt.toISOString(),
      status: 'active',
      rewards_earned: 0,
    })
    .select()
    .single();
  
  if (error) console.error('createStakingPosition error:', error);
  return position;
}

export async function getUserStakingPositions(userId: string): Promise<StakingPosition[]> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from('staking_positions')
    .select('*')
    .eq('user_id', userId)
    .order('staked_at', { ascending: false });
  return data || [];
}

export async function unstakePosition(positionId: string, userId: string): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from('staking_positions')
    .update({ status: 'unstaking' })
    .eq('id', positionId)
    .eq('user_id', userId)
    .eq('status', 'active');
  return !error;
}

// ── NFTs ────────────────────────────────────────────────────────

export async function recordNFTMint(data: {
  creationId?: string;
  ownerId: string;
  mintAddress?: string;
  metadataUri?: string;
  maxEditions?: number;
  royaltyBps?: number;
}): Promise<NFT | null> {
  const supabase = createSupabaseAdmin();
  const { data: nft, error } = await supabase
    .from('nfts')
    .insert({
      creation_id: data.creationId || null,
      owner_id: data.ownerId,
      mint_address: data.mintAddress || null,
      metadata_uri: data.metadataUri || null,
      edition_number: 1,
      max_editions: data.maxEditions || 1,
      royalty_bps: data.royaltyBps || 500,
      status: 'minted',
    })
    .select()
    .single();
  
  if (error) console.error('recordNFTMint error:', error);
  return nft;
}

export async function getUserNFTs(userId: string): Promise<NFT[]> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from('nfts')
    .select('*')
    .eq('owner_id', userId)
    .order('minted_at', { ascending: false });
  return data || [];
}

export async function listNFTForSale(nftId: string, userId: string, priceSol: number): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from('nfts')
    .update({ listed_price_sol: priceSol, status: 'listed' })
    .eq('id', nftId)
    .eq('owner_id', userId);
  return !error;
}

// ── Comments ────────────────────────────────────────────────────

export async function addComment(data: {
  creationId: string;
  userId: string;
  content: string;
  parentId?: string;
}): Promise<Comment | null> {
  const supabase = createSupabaseAdmin();
  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      creation_id: data.creationId,
      user_id: data.userId,
      content: data.content,
      parent_id: data.parentId || null,
    })
    .select()
    .single();
  
  if (error) console.error('addComment error:', error);
  return comment;
}

export async function getComments(creationId: string, limit = 50): Promise<Comment[]> {
  const supabase = createSupabaseAdmin();
  // Join with profiles to get username and avatar
  const { data } = await supabase
    .from('comments')
    .select(`
      *,
      profiles:user_id (username, avatar_url)
    `)
    .eq('creation_id', creationId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  // Flatten the joined data
  return (data || []).map((c: any) => ({
    ...c,
    username: c.profiles?.username || 'anonymous',
    avatar_url: c.profiles?.avatar_url || null,
    profiles: undefined,
  }));
}

export async function getReplies(parentId: string): Promise<Comment[]> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from('comments')
    .select(`
      *,
      profiles:user_id (username, avatar_url)
    `)
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true });
  
  return (data || []).map((c: any) => ({
    ...c,
    username: c.profiles?.username || 'anonymous',
    avatar_url: c.profiles?.avatar_url || null,
    profiles: undefined,
  }));
}

export async function deleteComment(commentId: string, userId: string): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);
  return !error;
}

// ── Likes ───────────────────────────────────────────────────────

export async function toggleLike(userId: string, creationId: string): Promise<{ liked: boolean; count: number }> {
  const supabase = createSupabaseAdmin();
  
  // Check if already liked
  const { data: existing } = await supabase
    .from('likes')
    .select('user_id')
    .eq('user_id', userId)
    .eq('creation_id', creationId)
    .single();
  
  if (existing) {
    // Unlike
    await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('creation_id', creationId);
  } else {
    // Like
    await supabase
      .from('likes')
      .insert({ user_id: userId, creation_id: creationId });
  }
  
  // Get updated count
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('creation_id', creationId);
  
  return { liked: !existing, count: count || 0 };
}

export async function isLiked(userId: string, creationId: string): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from('likes')
    .select('user_id')
    .eq('user_id', userId)
    .eq('creation_id', creationId)
    .single();
  return !!data;
}

export async function getLikeCount(creationId: string): Promise<number> {
  const supabase = createSupabaseAdmin();
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('creation_id', creationId);
  return count || 0;
}

export async function getUserLikedCreations(userId: string, creationIds: string[]): Promise<Set<string>> {
  if (creationIds.length === 0) return new Set();
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from('likes')
    .select('creation_id')
    .eq('user_id', userId)
    .in('creation_id', creationIds);
  return new Set((data || []).map(d => d.creation_id));
}
