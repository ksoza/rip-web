// lib/ai-types.ts
// Shared types for the creative studio

export type AssetType = 'text' | 'image' | 'video' | 'audio' | 'sprite' | 'voiceover';

export type Asset = {
  id: string;
  type: AssetType;
  name: string;
  url?: string;          // For media assets (image/video/audio URLs)
  content?: string;      // For text assets
  thumbnail?: string;    // Preview thumbnail
  duration?: number;     // Duration in seconds (video/audio)
  provider?: string;     // Which AI generated it
  prompt?: string;       // The prompt used
  metadata?: Record<string, any>;
  createdAt: number;
};

export type TimelineClip = {
  id: string;
  assetId: string;
  trackId: string;
  startTime: number;     // Start position in seconds
  duration: number;      // Clip duration in seconds
  trimStart?: number;    // Trim from start
  trimEnd?: number;      // Trim from end
  label?: string;
};

export type TimelineTrack = {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'image';
  clips: TimelineClip[];
  muted?: boolean;
  locked?: boolean;
  visible?: boolean;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  tracks: TimelineTrack[];
  assets: Asset[];
  duration: number;      // Total project duration in seconds
  fps: number;
  resolution: { width: number; height: number };
  createdAt: number;
  updatedAt: number;
};

export type GenerationRequest = {
  provider: string;
  prompt: string;
  model?: string;
  options?: Record<string, any>;
  userId: string;
};

export type GenerationResult = {
  success: boolean;
  asset?: Asset;
  error?: string;
  usage?: { credits: number };
};

// Character consistency
export type Character = {
  id: string;
  name: string;
  description: string;
  referenceImages: string[];   // URLs of reference images
  style: string;               // Art style: 'anime', 'realistic', 'cartoon', 'sprite'
  traits: string[];            // Visual traits for consistency
  voiceId?: string;            // ElevenLabs voice ID
};

// Scene definition for the timeline
export type Scene = {
  id: string;
  name: string;
  description: string;
  characters: string[];         // Character IDs
  background?: string;          // Background image URL
  dialogue?: { characterId: string; text: string }[];
  duration: number;
};

// Studio creation modes
export type StudioMode =
  | 'script'      // Story/script writing
  | 'character'   // Character design
  | 'scene'       // Scene composition
  | 'video'       // Video generation
  | 'audio'       // Voice & sound
  | 'timeline';   // Timeline editing

export const STUDIO_MODES: { id: StudioMode; icon: string; label: string; description: string }[] = [
  { id: 'script',    icon: '✍️', label: 'Script',    description: 'Write stories & dialogue' },
  { id: 'character', icon: '🎨', label: 'Character', description: 'Design & generate characters' },
  { id: 'scene',     icon: '🖼️', label: 'Scene',     description: 'Build scene compositions' },
  { id: 'video',     icon: '🎬', label: 'Video',     description: 'Generate video clips' },
  { id: 'audio',     icon: '🔊', label: 'Audio',     description: 'Voice, music & SFX' },
  { id: 'timeline',  icon: '🎞️', label: 'Timeline',  description: 'Edit & arrange everything' },
];
