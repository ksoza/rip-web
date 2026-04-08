// app/api/create/narrate/route.ts
// Character voice TTS — Fish Audio (primary, 1.6M+ character voices) → Novita MiniMax (fallback)
// Automatically searches Fish Audio's voice library to find voices matching each character name.
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

// ── Voice search cache (in-memory, per cold start) ──────────────
const voiceCache: Record<string, string> = {};

// ── Search Fish Audio library for a character voice ─────────────
async function findCharacterVoice(character: string, fishKey: string): Promise<string | null> {
  const cacheKey = character.toUpperCase();
  if (voiceCache[cacheKey]) return voiceCache[cacheKey];

  try {
    const res = await fetch(
      `https://api.fish.audio/model?title=${encodeURIComponent(character)}&language=en&page_size=3`,
      { headers: { 'Authorization': `Bearer ${fishKey}` } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const items = data.items || [];

    // Find best match — prefer exact title match, then English, then any
    const exactMatch = items.find((m: any) =>
      m.title?.toLowerCase() === character.toLowerCase() && m.state === 'trained'
    );
    const englishMatch = items.find((m: any) =>
      m.languages?.includes('en') && m.state === 'trained'
    );
    const anyMatch = items.find((m: any) => m.state === 'trained');

    const best = exactMatch || englishMatch || anyMatch;
    if (best?._id) {
      voiceCache[cacheKey] = best._id;
      console.log(`[narrate] Matched "${character}" → voice "${best.title}" (${best._id})`);
      return best._id;
    }
  } catch (e) {
    console.error(`[narrate] Voice search failed for "${character}":`, e);
  }

  return null;
}

// ── Generate speech via Fish Audio ──────────────────────────────
async function fishTTS(text: string, referenceId: string, fishKey: string): Promise<string | null> {
  const res = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${fishKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      reference_id: referenceId,
      format: 'mp3',
      mp3_bitrate: 128,
      normalize: true,
      latency: 'balanced',
    }),
  });

  if (!res.ok) {
    console.error(`[narrate] Fish Audio TTS HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
    return null;
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('audio') || ct.includes('octet-stream') || ct.includes('mpeg')) {
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 100) return null; // too small = error
    return `data:audio/mpeg;base64,${Buffer.from(buffer).toString('base64')}`;
  }

  return null;
}

// ── Novita MiniMax TTS (fallback — generic voices) ──────────────
const NOVITA_MALE   = ['male-qn-qingse', 'male-qn-jingying', 'male-qn-badao'];
const NOVITA_FEMALE = ['female-shaonv', 'female-yujie', 'female-chengshu'];
let novitaVoiceIdx = 0;

async function novitaTTS(text: string, character: string, novitaKey: string): Promise<string | null> {
  const lc = character.toLowerCase();
  const isFemale = /\b(she|her|woman|girl|queen|princess|mrs|ms|lady|mom|mother|sister)\b/i.test(lc)
    || /a$|ina$|ella$|ette$/i.test(lc);
  const voices = isFemale ? NOVITA_FEMALE : NOVITA_MALE;
  const voiceId = voices[novitaVoiceIdx++ % voices.length];

  const res = await fetch('https://api.novita.ai/v3/sync/minimax-speech-02-hd', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${novitaKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, voice_id: voiceId, speed: 1.0, vol: 1.0, output_format: 'mp3' }),
  });

  if (!res.ok) return null;

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('audio') || ct.includes('octet-stream')) {
    const buffer = await res.arrayBuffer();
    return `data:audio/mpeg;base64,${Buffer.from(buffer).toString('base64')}`;
  }

  // JSON response
  try {
    const data = await res.json();
    if (data.audio_url) {
      const r = await fetch(data.audio_url);
      if (r.ok) return `data:audio/mpeg;base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`;
    }
    if (data.audio?.data) return `data:audio/mpeg;base64,${data.audio.data}`;
    if (data.audios?.[0]?.audio_url) {
      const r = await fetch(data.audios[0].audio_url);
      if (r.ok) return `data:audio/mpeg;base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`;
    }
  } catch { /* fall through */ }

  return null;
}

// ── POST handler ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sceneId } = body;
    const fishKey = process.env.FISH_AUDIO_API_KEY || '';
    const novitaKey = process.env.NOVITA_API_KEY || '';

    // ── Mode 1: Character dialogue — [{character, line}] ────────
    if (body.dialogue && Array.isArray(body.dialogue) && body.dialogue.length > 0) {
      const dialogue: { character: string; line: string }[] = body.dialogue;
      const audioClips: { character: string; line: string; audio: string }[] = [];
      const errors: string[] = [];

      for (const d of dialogue) {
        if (!d.line?.trim()) continue;

        let audio: string | null = null;

        // Try Fish Audio first — real character voice
        if (fishKey) {
          try {
            const voiceId = await findCharacterVoice(d.character, fishKey);
            if (voiceId) {
              audio = await fishTTS(d.line, voiceId, fishKey);
              if (audio) {
                audioClips.push({ character: d.character, line: d.line, audio });
                continue;
              }
            }
          } catch (e: unknown) {
            errors.push(`Fish Audio (${d.character}): ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        // Fallback to Novita (generic voice)
        if (!audio && novitaKey) {
          try {
            audio = await novitaTTS(d.line, d.character, novitaKey);
            if (audio) {
              audioClips.push({ character: d.character, line: d.line, audio });
              continue;
            }
          } catch (e: unknown) {
            errors.push(`Novita (${d.character}): ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        errors.push(`No audio for "${d.character}": all providers failed`);
      }

      if (audioClips.length === 0) {
        return NextResponse.json({
          error: `No character audio generated. ${errors.join(' | ')}`,
          sceneId,
        }, { status: 500 });
      }

      return NextResponse.json({
        audioClips,
        sceneId,
        provider: fishKey ? 'fish-audio' : 'novita-fallback',
        audio: audioClips[0].audio, // backward compat
      });
    }

    // ── Mode 2: Simple text TTS (fallback for scenes without dialogue)
    const text = body.text;
    if (!text) {
      return NextResponse.json({ error: 'Missing dialogue or text' }, { status: 400 });
    }

    if (novitaKey) {
      const audio = await novitaTTS(text, 'narrator', novitaKey);
      if (audio) return NextResponse.json({ audio, sceneId, provider: 'novita' });
    }

    return NextResponse.json({ error: 'No TTS providers available' }, { status: 500 });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[narrate] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
