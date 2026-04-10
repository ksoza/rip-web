// lib/store.ts
// Zustand store for Creative Studio state - V2 + Phase 3A
import { create } from 'zustand';

// -- Utilities ---------------------------------------------------
let _c = 0;
export function genId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${(++_c).toString(36)}`;
}

// -- Asset Types -------------------------------------------------
export type AssetType = 'text' | 'image' | 'video' | 'audio' | 'sprite' | 'voice' | 'sfx' | 'music' | 'voiceover';

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  url?: string;
  content?: string;
  thumbnail?: string;
  duration?: number;
  provider?: string;
  prompt?: string;
  createdAt: number;
}

// -- Character ---------------------------------------------------
export interface Character {
  id: string;
  name: string;
  description: string;
  style: string;
  traits: string[];
  referenceImage?: string;
  voiceId?: string;
}

// -- Timeline Types ----------------------------------------------
export type ClipType = 'video' | 'image' | 'audio' | 'voiceover' | 'music' | 'sfx' | 'text';

export interface TimelineClip {
  id: string;
  assetId?: string;
  trackId?: string;        // Kept for backward compat
  name: string;
  type: ClipType;
  startTime: number;
  duration: number;
  url?: string;
  content?: string;
  volume?: number;         // 0-1
  opacity?: number;        // 0-1
  label?: string;          // Backward compat
}

export type TrackType = 'video' | 'image' | 'audio' | 'voiceover' | 'music' | 'sfx' | 'text';

export interface TimelineTrack {
  id: string;
  name: string;
  type: TrackType;
  clips: TimelineClip[];
  muted: boolean;
  locked: boolean;
}

// -- Studio Mode - Phase 3A: added lipsync, compose, controller -
export type StudioMode = 'script' | 'character' | 'scene' | 'scenegen' | 'episode' | 'video' | 'audio' | 'lipsync' | 'compose' | 'controller' | 'timeline';

// -- Main App Tab ------------------------------------------------
export type AppTab = 'studio' | 'discover' | 'wallet' | 'settings';

// -- Store Interface ---------------------------------------------
interface StudioState {
  // - App-level navigation -------------------------------------
  tab: AppTab;
  setTab: (tab: AppTab) => void;

  // - Studio mode ----------------------------------------------
  mode: StudioMode;
  setMode: (mode: StudioMode) => void;

  // - Assets ---------------------------------------------------
  assets: Asset[];
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;

  // - Characters -----------------------------------------------
  characters: Character[];
  addCharacter: (char: Character) => void;
  removeCharacter: (id: string) => void;

  // - Timeline -------------------------------------------------
  tracks: TimelineTrack[];
  playhead: number;
  zoom: number;             // pixels per second
  addTrack: (track: TimelineTrack) => void;
  updateTrack: (id: string, patch: Partial<Omit<TimelineTrack, 'id' | 'clips'>>) => void;
  removeTrack: (id: string) => void;
  addClipToTrack: (trackId: string, clip: TimelineClip) => void;
  updateClip: (trackId: string, clipId: string, patch: Partial<TimelineClip>) => void;
  removeClip: (trackId: string, clipId: string) => void;
  moveClip: (trackId: string, clipId: string, newStart: number) => void;
  setPlayhead: (time: number) => void;
  setZoom: (zoom: number) => void;

  // - Selection ------------------------------------------------
  selectedAssetId: string | null;
  selectedClipId: string | null;
  selectedCharacterId: string | null;
  setSelectedAsset: (id: string | null) => void;
  setSelectedClip: (id: string | null) => void;
  selectCharacter: (id: string | null) => void;
}

// -- Create Store ------------------------------------------------
export const useStudioStore = create<StudioState>((set) => ({
  // - App tab --------------------------------------------------
  tab: 'studio',
  setTab: (tab) => set({ tab }),

  // - Studio mode ----------------------------------------------
  mode: 'script',
  setMode: (mode) => set({ mode }),

  // - Assets ---------------------------------------------------
  assets: [],
  addAsset: (asset) => set((s) => ({ assets: [asset, ...s.assets] })),
  removeAsset: (id) => set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),

  // - Characters -----------------------------------------------
  characters: [],
  addCharacter: (char) => set((s) => ({ characters: [...s.characters, char] })),
  removeCharacter: (id) => set((s) => ({ characters: s.characters.filter((c) => c.id !== id) })),

  // - Timeline -------------------------------------------------
  tracks: [],   // Start empty - user adds tracks as needed
  playhead: 0,
  zoom: 40,     // 40px per second default

  addTrack: (track) => set((s) => ({ tracks: [...s.tracks, track] })),

  updateTrack: (id, patch) => set((s) => ({
    tracks: s.tracks.map((t) => t.id === id ? { ...t, ...patch } : t),
  })),

  removeTrack: (id) => set((s) => ({
    tracks: s.tracks.filter((t) => t.id !== id),
  })),

  addClipToTrack: (trackId, clip) => set((s) => ({
    tracks: s.tracks.map((t) =>
      t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
    ),
  })),

  updateClip: (trackId, clipId, patch) => set((s) => ({
    tracks: s.tracks.map((t) =>
      t.id === trackId
        ? { ...t, clips: t.clips.map((c) => c.id === clipId ? { ...c, ...patch } : c) }
        : t
    ),
  })),

  removeClip: (trackId, clipId) => set((s) => ({
    tracks: s.tracks.map((t) =>
      t.id === trackId
        ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
        : t
    ),
  })),

  moveClip: (trackId, clipId, newStart) => set((s) => ({
    tracks: s.tracks.map((t) =>
      t.id === trackId
        ? { ...t, clips: t.clips.map((c) => c.id === clipId ? { ...c, startTime: Math.max(0, newStart) } : c) }
        : t
    ),
  })),

  setPlayhead: (time) => set({ playhead: time }),
  setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(200, zoom)) }),

  // - Selection ------------------------------------------------
  selectedAssetId: null,
  selectedClipId: null,
  selectedCharacterId: null,
  setSelectedAsset: (id) => set({ selectedAssetId: id }),
  setSelectedClip: (id) => set({ selectedClipId: id }),
  selectCharacter: (id) => set({ selectedCharacterId: id }),
}));
