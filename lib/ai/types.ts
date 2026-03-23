// lib/ai/types.ts
// Core types for the multi-AI provider system

export type GenerationType =
  | 'text'       // Story/script writing
  | 'image'      // Character art, scenes
  | 'sprite'     // Sprite sheets for animation
  | 'video'      // Video generation
  | 'voice'      // Voice/dialogue generation
  | 'lipsync'    // Lip sync to audio
  | 'motion'     // Stick-figure pose control
  | 'faceswap'   // Face transfer
  | 'sfx'        // Sound effects
  | 'music';     // Background music

export type ProviderStatus = 'ready' | 'no_key' | 'error' | 'generating';

export interface AIProvider {
  id: string;
  name: string;
  icon: string;
  type: GenerationType;
  description: string;
  envKey: string;           // Environment variable name for API key
  models?: string[];        // Available models
  defaultModel?: string;
}

export interface GenerationRequest {
  type: GenerationType;
  provider: string;         // Provider ID
  model?: string;
  prompt: string;
  params?: Record<string, any>;
  userId: string;
  projectId?: string;
}

export interface GenerationResult {
  id: string;
  type: GenerationType;
  provider: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  prompt: string;
  output?: {
    url?: string;           // URL for media output
    text?: string;          // Text output
    urls?: string[];        // Multiple outputs
    metadata?: Record<string, any>;
  };
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// ── Timeline Types ──────────────────────────────────────────────

export type TrackType = 'video' | 'audio' | 'text' | 'image' | 'effect';

export interface TimelineClip {
  id: string;
  trackId: string;
  type: TrackType;
  name: string;
  startTime: number;        // in seconds
  duration: number;         // in seconds
  sourceUrl?: string;
  sourceText?: string;
  thumbnail?: string;
  params?: Record<string, any>;
}

export interface TimelineTrack {
  id: string;
  type: TrackType;
  name: string;
  clips: TimelineClip[];
  muted?: boolean;
  locked?: boolean;
  visible?: boolean;
}

export interface TimelineProject {
  id: string;
  name: string;
  tracks: TimelineTrack[];
  duration: number;         // total duration in seconds
  fps: number;
  resolution: { width: number; height: number };
  createdAt: string;
  updatedAt: string;
}

// ── Asset Types ─────────────────────────────────────────────────

export interface Asset {
  id: string;
  type: GenerationType;
  name: string;
  url?: string;
  text?: string;
  thumbnail?: string;
  provider: string;
  prompt: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

// ── Character Types ─────────────────────────────────────────────

export interface Character {
  id: string;
  name: string;
  description: string;
  referenceImages: string[];
  style: string;
  traits: string[];
  voiceId?: string;
  createdAt: string;
}
