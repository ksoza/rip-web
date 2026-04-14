// lib/kokoro-tts.ts
// Kokoro TTS — free text-to-speech via HuggingFace Spaces
// No API key. No cost. High quality neural TTS.
//
// Uses the official Kokoro HF Space: https://huggingface.co/spaces/hexgrad/Kokoro-TTS
// Voices: https://huggingface.co/hexgrad/Kokoro-82M
//
// Wired into the scene pipeline for character dialogue audio generation.

const KOKORO_SPACE = 'https://hexgrad-kokoro-tts.hf.space';
const GRADIO_API = `${KOKORO_SPACE}/gradio_api`;
const GENERATE_FN_INDEX = 4; // fn_index for generate (text, voice, speed, gpu) -> (audio, tokens)

// ── Voice mapping ──────────────────────────────────────────────
// Map character "types" to distinct Kokoro voices so each character sounds different.
// Voices: af_* = American Female, am_* = American Male, bf_* = British Female, bm_* = British Male

export const KOKORO_VOICES = {
  // Female voices
  'af_heart':   { label: '🇺🇸 🚺 Heart ❤️',   gender: 'female', accent: 'us' },
  'af_bella':   { label: '🇺🇸 🚺 Bella 🔥',   gender: 'female', accent: 'us' },
  'af_nicole':  { label: '🇺🇸 🚺 Nicole 🎧',  gender: 'female', accent: 'us' },
  'af_aoede':   { label: '🇺🇸 🚺 Aoede',      gender: 'female', accent: 'us' },
  'af_kore':    { label: '🇺🇸 🚺 Kore',       gender: 'female', accent: 'us' },
  'af_sarah':   { label: '🇺🇸 🚺 Sarah',      gender: 'female', accent: 'us' },
  'af_nova':    { label: '🇺🇸 🚺 Nova',       gender: 'female', accent: 'us' },
  'af_sky':     { label: '🇺🇸 🚺 Sky',        gender: 'female', accent: 'us' },
  'af_jessica': { label: '🇺🇸 🚺 Jessica',    gender: 'female', accent: 'us' },
  'af_river':   { label: '🇺🇸 🚺 River',      gender: 'female', accent: 'us' },
  // Male voices
  'am_michael': { label: '🇺🇸 🚹 Michael',    gender: 'male', accent: 'us' },
  'am_fenrir':  { label: '🇺🇸 🚹 Fenrir',     gender: 'male', accent: 'us' },
  'am_puck':    { label: '🇺🇸 🚹 Puck',       gender: 'male', accent: 'us' },
  'am_echo':    { label: '🇺🇸 🚹 Echo',       gender: 'male', accent: 'us' },
  'am_eric':    { label: '🇺🇸 🚹 Eric',       gender: 'male', accent: 'us' },
  'am_liam':    { label: '🇺🇸 🚹 Liam',       gender: 'male', accent: 'us' },
  'am_onyx':    { label: '🇺🇸 🚹 Onyx',       gender: 'male', accent: 'us' },
  'am_adam':    { label: '🇺🇸 🚹 Adam',       gender: 'male', accent: 'us' },
} as const;

export type KokoroVoiceId = keyof typeof KOKORO_VOICES;

// Rotation pools for auto-assigning distinct voices to characters
const FEMALE_VOICES: KokoroVoiceId[] = [
  'af_heart', 'af_bella', 'af_nicole', 'af_aoede', 'af_kore',
  'af_sarah', 'af_nova', 'af_sky', 'af_jessica', 'af_river',
];
const MALE_VOICES: KokoroVoiceId[] = [
  'am_michael', 'am_fenrir', 'am_puck', 'am_echo', 'am_eric',
  'am_liam', 'am_onyx', 'am_adam',
];
const ALL_VOICES: KokoroVoiceId[] = [...FEMALE_VOICES, ...MALE_VOICES];

/**
 * Auto-assign a voice to a character name.
 * Uses a hash of the name for consistent assignment (same character = same voice every time).
 * Returns a different voice for each character.
 */
export function assignVoice(characterName: string, usedVoices: Set<string> = new Set()): KokoroVoiceId {
  // Simple hash of character name
  let hash = 0;
  for (let i = 0; i < characterName.length; i++) {
    hash = ((hash << 5) - hash + characterName.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);

  // Pick from all voices, but prefer ones not yet used
  const available = ALL_VOICES.filter(v => !usedVoices.has(v));
  const pool = available.length > 0 ? available : ALL_VOICES;
  return pool[hash % pool.length];
}

// ── TTS generation ─────────────────────────────────────────────

export interface KokoroTTSResult {
  /** URL to the generated WAV audio file */
  audioUrl: string;
  /** Duration of the generated audio in seconds */
  duration: number;
  /** The voice ID that was used */
  voice: KokoroVoiceId;
  /** Phonetic representation of the text */
  phonemes?: string;
}

/**
 * Generate speech audio from text via Kokoro TTS (free, HuggingFace Space).
 *
 * @param text    - The text to speak
 * @param voice   - Kokoro voice ID (default: af_heart)
 * @param speed   - Speaking speed multiplier (default: 1.0)
 * @param useGpu  - Use ZeroGPU for faster generation (default: true)
 * @returns Audio URL and metadata
 */
export async function kokoroTTS(
  text: string,
  voice: KokoroVoiceId = 'af_heart',
  speed: number = 1.0,
  useGpu: boolean = true,
): Promise<KokoroTTSResult> {
  if (!text.trim()) {
    throw new Error('Kokoro TTS: empty text');
  }

  // Cap at 5000 chars (HF space limit)
  const cappedText = text.slice(0, 5000);

  // Generate a random session hash
  const sessionHash = Math.random().toString(36).slice(2, 13);

  // Step 1: Join the queue
  const joinRes = await fetch(`${GRADIO_API}/queue/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [cappedText, voice, speed, useGpu],
      fn_index: GENERATE_FN_INDEX,
      session_hash: sessionHash,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!joinRes.ok) {
    throw new Error(`Kokoro TTS queue join failed: HTTP ${joinRes.status}`);
  }

  const joinData = await joinRes.json();
  const eventId = joinData.event_id;
  if (!eventId) {
    throw new Error('Kokoro TTS: no event_id returned');
  }

  // Step 2: Read SSE stream for result
  const sseRes = await fetch(
    `${GRADIO_API}/queue/data?session_hash=${sessionHash}`,
    { signal: AbortSignal.timeout(120_000) },
  );

  if (!sseRes.ok || !sseRes.body) {
    throw new Error(`Kokoro TTS SSE failed: HTTP ${sseRes.status}`);
  }

  // Parse SSE stream
  const reader = sseRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse complete SSE events
    const events = buffer.split('\n\n');
    buffer = events.pop() || ''; // Keep incomplete event in buffer

    for (const event of events) {
      if (!event.startsWith('data: ')) continue;

      try {
        const data = JSON.parse(event.slice(6));

        if (data.msg === 'process_completed') {
          reader.cancel();

          if (!data.success) {
            throw new Error(`Kokoro TTS failed: ${data.output?.error || 'unknown error'}`);
          }

          const audioFile = data.output?.data?.[0];
          const phonemes = data.output?.data?.[1];
          const duration = data.output?.duration || 0;

          if (!audioFile?.url) {
            throw new Error('Kokoro TTS: no audio URL in response');
          }

          return {
            audioUrl: audioFile.url,
            duration,
            voice,
            phonemes: typeof phonemes === 'string' ? phonemes : undefined,
          };
        }
      } catch (parseErr) {
        // Skip non-JSON lines
        if (parseErr instanceof SyntaxError) continue;
        throw parseErr;
      }
    }
  }

  throw new Error('Kokoro TTS: SSE stream ended without result');
}

// ── Dialogue audio generation ──────────────────────────────────

export interface DialogueLine {
  character: string;
  line: string;
}

export interface DialogueAudioResult {
  /** URL to the combined dialogue audio file (all lines sequenced) */
  audioUrl: string;
  /** Individual line results */
  lines: {
    character: string;
    line: string;
    audioUrl: string;
    voice: KokoroVoiceId;
    duration: number;
  }[];
  /** Total duration of all dialogue */
  totalDuration: number;
}

/**
 * Generate audio for all dialogue lines in a scene.
 * Each character gets a distinct, consistent voice.
 * Lines are generated sequentially (can be played in order by the frontend).
 *
 * @param dialogue - Array of { character, line } objects
 * @param speed    - Speaking speed multiplier (default: 1.0)
 * @returns Audio URLs for each line + total duration
 */
export async function generateDialogueAudio(
  dialogue: DialogueLine[],
  speed: number = 1.0,
): Promise<DialogueAudioResult> {
  if (!dialogue.length) {
    return { audioUrl: '', lines: [], totalDuration: 0 };
  }

  // Assign voices to characters
  const voiceMap = new Map<string, KokoroVoiceId>();
  const usedVoices = new Set<string>();

  for (const d of dialogue) {
    if (!voiceMap.has(d.character)) {
      const voice = assignVoice(d.character, usedVoices);
      voiceMap.set(d.character, voice);
      usedVoices.add(voice);
    }
  }

  // Generate TTS for each line (sequentially to respect rate limits)
  const lines: DialogueAudioResult['lines'] = [];
  let totalDuration = 0;

  for (const d of dialogue) {
    const voice = voiceMap.get(d.character) || 'af_heart';
    try {
      const result = await kokoroTTS(d.line, voice, speed);
      lines.push({
        character: d.character,
        line: d.line,
        audioUrl: result.audioUrl,
        voice,
        duration: result.duration,
      });
      totalDuration += result.duration;
    } catch (err) {
      console.warn(`[kokoro-tts] Failed to generate TTS for "${d.character}": ${err}`);
      // Add a silent placeholder — don't break the whole scene for one line
      lines.push({
        character: d.character,
        line: d.line,
        audioUrl: '',
        voice,
        duration: 0,
      });
    }
  }

  // Use the first line's audio as the "main" audioUrl
  // (frontend will sequence all lines)
  const mainAudioUrl = lines.find(l => l.audioUrl)?.audioUrl || '';

  return {
    audioUrl: mainAudioUrl,
    lines,
    totalDuration,
  };
}

/**
 * Check if Kokoro TTS is available (always true — it's a public HF Space).
 * In practice it might be temporarily down, but we always try.
 */
export function isKokoroAvailable(): boolean {
  return true;
}
