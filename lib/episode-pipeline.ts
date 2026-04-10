// lib/episode-pipeline.ts
// Episode generation pipeline - chains script -> scene pipeline
// Prompt -> AI Script -> Scene-by-scene video+audio via unified pipeline

import type { ArtStyleId } from './shows';
import type { SceneInput } from './scene-pipeline';

// -- Script types (matches /api/create/script output) ----------

export interface ScriptDialogue {
  character: string;
  line: string;
  direction?: string;
}

export interface ScriptScene {
  sceneNum: number;
  heading: string;
  description: string;
  action: string;
  dialogue: ScriptDialogue[];
  duration: string;           // "0:00-0:15"
  mood: string;
  cameraNote: string;
  transition: string;
}

export interface Script {
  title: string;
  logline: string;
  scenes: ScriptScene[];
  model?: string;
}

// -- Episode types ---------------------------------------------

export interface EpisodeInput {
  show: string;
  artStyle: ArtStyleId;
  characters: string[];
  prompt: string;
  format: 'short' | 'scene' | 'episode' | 'trailer' | 'music_vid';
  aspectRatio?: string;
  model?: string;
}

export interface EpisodeSceneInput extends SceneInput {
  scriptScene: ScriptScene;
}

export interface EpisodeResult {
  script: Script;
  sceneInputs: EpisodeSceneInput[];
}

// -- Duration parsing ------------------------------------------

/** Parse "0:00-0:15" -> 15 (seconds) */
export function parseScriptDuration(duration: string): number {
  const match = duration.match(/(\d+):(\d{2})\s*-\s*(\d+):(\d{2})/);
  if (!match) return 8;

  const startSec = parseInt(match[1]) * 60 + parseInt(match[2]);
  const endSec   = parseInt(match[3]) * 60 + parseInt(match[4]);
  const dur      = endSec - startSec;

  // Clamp to model limits: 3-16 s per scene
  return Math.min(16, Math.max(3, dur));
}

// -- Script scene -> SceneInput mapping -------------------------

/** Convert one script scene into a SceneInput for generateScene() */
export function scriptSceneToSceneInput(
  scene: ScriptScene,
  show: string,
  artStyle: ArtStyleId,
  allCharacters: string[],
  aspectRatio?: string,
  model?: string,
): EpisodeSceneInput {
  const sceneDescription = [
    scene.heading,
    scene.action,
    scene.mood      ? `Mood: ${scene.mood}`     : '',
    scene.cameraNote ? `Camera: ${scene.cameraNote}` : '',
  ].filter(Boolean).join('. ');

  const sceneCharacters = scene.dialogue.length > 0
    ? [...new Set(scene.dialogue.map(d => d.character))]
    : allCharacters;

  const dialogue = scene.dialogue.map(d => ({
    character: d.character,
    line: d.direction ? `(${d.direction}) ${d.line}` : d.line,
  }));

  return {
    show,
    artStyle,
    sceneDescription,
    dialogue,
    characters: sceneCharacters,
    duration:    parseScriptDuration(scene.duration),
    aspectRatio: aspectRatio || '16:9',
    model,
    scriptScene: scene,
  };
}

/** Convert an entire script into ready-to-generate SceneInputs */
export function mapScriptToSceneInputs(
  script: Script,
  episode: EpisodeInput,
): EpisodeSceneInput[] {
  return script.scenes.map(scene =>
    scriptSceneToSceneInput(
      scene,
      episode.show,
      episode.artStyle,
      episode.characters,
      episode.aspectRatio,
      episode.model,
    ),
  );
}
