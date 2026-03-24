// lib/ghostface/types.ts
// Core types for the GhOSTface background AI agent

export type TaskCategory =
  | 'text-gen'
  | 'image-gen'
  | 'video-gen'
  | 'audio-gen'
  | 'tts'
  | 'music'
  | 'sprite'
  | 'faceswap'
  | 'lipsync'
  | 'motion';

export type ModelCapability = {
  id: string;
  provider: string;           // e.g. 'huggingface', 'anthropic', 'openai'
  name: string;               // Human-readable name
  category: TaskCategory;
  envKey: string;             // Required env var
  available: boolean;         // Has API key configured
  endpoint?: string;          // API endpoint / HuggingFace model ID
  strengths: string[];        // e.g. ['anime', 'fast', 'photorealistic']
  weaknesses: string[];       // e.g. ['slow-cold-start', 'text-rendering']
  costTier: 'free' | 'cheap' | 'moderate' | 'expensive';
  avgLatencyMs: number;       // Running average
  successRate: number;        // 0-1, from memory
  lastUsed?: number;          // Timestamp
  lastError?: string;
  metadata?: Record<string, unknown>;
};

export type RouteRequest = {
  category: TaskCategory;
  prompt: string;
  style?: string;             // Art style hint
  priority?: 'speed' | 'quality' | 'cost';
  aspectRatio?: string;
  width?: number;
  height?: number;
  negativePrompt?: string;
  userId?: string;
  retryCount?: number;
  excludeModels?: string[];   // Models to skip (already failed)
  metadata?: Record<string, unknown>;
};

export type RouteResult = {
  success: boolean;
  modelId: string;
  provider: string;
  data?: unknown;             // Response data (blob, JSON, etc.)
  url?: string;               // Generated asset URL
  latencyMs: number;
  enhanced_prompt?: string;   // The prompt after enhancement
  fallback?: boolean;         // Was this a fallback model?
  error?: string;
};

export type MemoryEntry = {
  id?: string;
  model_id: string;
  category: TaskCategory;
  prompt_hash: string;
  style?: string;
  success: boolean;
  latency_ms: number;
  error?: string;
  user_id?: string;
  created_at?: string;
};

export type HealthStatus = {
  modelId: string;
  available: boolean;
  lastCheck: number;
  avgLatency: number;
  errorRate: number;
  consecutiveFailures: number;
};
