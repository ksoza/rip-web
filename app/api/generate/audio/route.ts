// app/api/generate/audio/route.ts
// Voice generation (VoxCPM, ElevenLabs), sound effects (AudioGen), music (MusicGen)
// VoxCPM is the primary voice provider (self-hosted, zero API cost)
// nexos.ai TTS available as an alternative voice provider
import { NextRequest, NextResponse } from 'next/server';
import { isNexosConfigured, nexosTTS } from '@/lib/nexos';
import { generateSpeech, isVoxCPMAvailable, type VoxCPMConfig } from '@/lib/voxcpm';
import { SHOW_PROFILES } from '@/lib/shows';
import { logGeneration } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    const {
      text, prompt, provider = 'auto', voiceId, model, duration = 10,
      // VoxCPM-specific params
      show, character, voiceDesc, referenceAudioUrl, referenceTranscript,
    } = await req.json();

    if ((!text && !prompt)) {
      return NextResponse.json({ error: 'Missing text/prompt' }, { status: 400 });
    }

    // Auto-select: VoxCPM if available, else ElevenLabs, else nexos
    let resolvedProvider = provider;
    if (provider === 'auto') {
      if (isVoxCPMAvailable()) {
        resolvedProvider = 'voxcpm';
      } else if (process.env.ELEVENLABS_API_KEY) {
        resolvedProvider = 'elevenlabs';
      } else if (isNexosConfigured()) {
        resolvedProvider = 'nexos-tts';
      } else {
        return NextResponse.json({ error: 'No voice provider configured' }, { status: 503 });
      }
    }

    switch (resolvedProvider) {
      // -- VoxCPM (primary - self-hosted, zero cost) ----------------
      case 'voxcpm': {
        if (!isVoxCPMAvailable()) {
          return NextResponse.json({ error: 'VoxCPM not configured. Set VOXCPM_API_URL or HUGGINGFACE_API_KEY.' }, { status: 503 });
        }

        // Resolve voice description from show profile if available
        let resolvedVoiceDesc = voiceDesc;
        if (!resolvedVoiceDesc && show && character) {
          const profile = SHOW_PROFILES[show];
          if (profile) {
            const char = profile.characters.find(
              (c) => c.name.toLowerCase() === (character as string).toLowerCase()
            );
            if (char) resolvedVoiceDesc = char.voiceDesc;
          }
        }

        const config: VoxCPMConfig = {
          voiceDesc: resolvedVoiceDesc,
          referenceAudioUrl,
          referenceTranscript,
          temperature: 0.3,
        };

        const result = await generateSpeech(text || prompt, config);

        if (!result.success) {
          return NextResponse.json({ error: result.error, backend: result.backend }, { status: 500 });
        }

        await logGeneration({
          userId, creationType: 'audio', model: `voxcpm-${result.backend}`,
          prompt: (text || prompt).slice(0, 500),
          result: { duration: result.duration, character, show, backend: result.backend },
          success: true,
        }).catch(() => {});

        return NextResponse.json({
          type: 'voice', provider: 'voxcpm', backend: result.backend,
          url: result.audioUrl, duration: result.duration, sampleRate: result.sampleRate,
        });
      }

      // -- ElevenLabs Voice/TTS ------------------------------------
      case 'elevenlabs': {
        const key = process.env.ELEVENLABS_API_KEY;
        if (!key) return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 503 });

        const voice = voiceId || 'EXAVITQu4vr4xnSDxMaL';
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
          method: 'POST',
          headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            model_id: model || 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.5 },
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          return NextResponse.json({ error: `ElevenLabs error: ${err}` }, { status: 500 });
        }

        const audioBuffer = await res.arrayBuffer();
        const base64 = Buffer.from(audioBuffer).toString('base64');
        const dataUrl = `data:audio/mpeg;base64,${base64}`;
        const estDuration = Math.ceil(text.length / 15);

        await logGeneration({ userId, creationType: 'audio', model: 'elevenlabs', prompt: text.slice(0, 500), result: { duration: estDuration }, success: true }).catch(() => {});

        return NextResponse.json({ type: 'voice', provider, url: dataUrl, duration: estDuration });
      }

      // -- Sound Effects (Replicate / AudioGen) --------------------
      case 'sfx':
      case 'audiogen': {
        const token = process.env.REPLICATE_API_TOKEN;
        if (!token) return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 503 });

        const createRes = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'wait' },
          body: JSON.stringify({ model: 'meta/audiogen', input: { prompt: prompt || text, duration } }),
        });

        if (!createRes.ok) throw new Error(`Replicate error: ${await createRes.text()}`);
        let prediction = await createRes.json();

        if (prediction.status === 'processing' || prediction.status === 'starting') {
          for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const poll = await fetch(prediction.urls.get, { headers: { 'Authorization': `Bearer ${token}` } });
            prediction = await poll.json();
            if (prediction.status === 'succeeded' || prediction.status === 'failed') break;
          }
        }

        if (prediction.status !== 'succeeded') {
          return NextResponse.json({ error: prediction.error || 'SFX generation failed' }, { status: 500 });
        }

        const sfxUrl = typeof prediction.output === 'string' ? prediction.output : prediction.output?.[0];
        await logGeneration({ userId, creationType: 'audio', model: 'audiogen', prompt: (prompt || text).slice(0, 500), result: { url: sfxUrl, duration }, success: true }).catch(() => {});

        return NextResponse.json({ type: 'sfx', provider: 'audiogen', url: sfxUrl, duration });
      }

      // -- Music (Replicate / MusicGen) ----------------------------
      case 'music':
      case 'musicgen': {
        const token = process.env.REPLICATE_API_TOKEN;
        if (!token) return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 503 });

        const createRes = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'wait' },
          body: JSON.stringify({
            model: 'meta/musicgen',
            input: { prompt: prompt || text, duration: Math.min(duration, 30), model_version: 'stereo-large' },
          }),
        });

        if (!createRes.ok) throw new Error(`Replicate error: ${await createRes.text()}`);
        let prediction = await createRes.json();

        if (prediction.status === 'processing' || prediction.status === 'starting') {
          for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const poll = await fetch(prediction.urls.get, { headers: { 'Authorization': `Bearer ${token}` } });
            prediction = await poll.json();
            if (prediction.status === 'succeeded' || prediction.status === 'failed') break;
          }
        }

        if (prediction.status !== 'succeeded') {
          return NextResponse.json({ error: prediction.error || 'Music generation failed' }, { status: 500 });
        }

        const musicUrl = typeof prediction.output === 'string' ? prediction.output : prediction.output?.[0];
        await logGeneration({ userId, creationType: 'audio', model: 'musicgen', prompt: (prompt || text).slice(0, 500), result: { url: musicUrl, duration }, success: true }).catch(() => {});

        return NextResponse.json({ type: 'music', provider: 'musicgen', url: musicUrl, duration });
      }

      // -- nexos.ai TTS (OpenAI-compatible) -------------------------
      case 'nexos-tts': {
        if (!isNexosConfigured()) {
          return NextResponse.json({ error: 'NEXOS_API_KEY not configured' }, { status: 503 });
        }

        const audioBuffer = await nexosTTS(text || prompt, {
          model: model || 'tts-1',
          voice: voiceId || 'alloy',
        });
        const base64 = Buffer.from(audioBuffer).toString('base64');
        const dataUrl = `data:audio/mpeg;base64,${base64}`;
        const estDuration = Math.ceil((text || prompt).length / 15);

        await logGeneration({ userId, creationType: 'audio', model: 'nexos-tts', prompt: (text || prompt).slice(0, 500), result: { duration: estDuration }, success: true }).catch(() => {});

        return NextResponse.json({ type: 'voice', provider: 'nexos-tts', url: dataUrl, duration: estDuration });
      }

      default:
        return NextResponse.json({ error: `Unknown audio provider: ${resolvedProvider}` }, { status: 400 });
    }

  } catch (err: any) {
    console.error('Audio generation error:', err);
    return NextResponse.json({ error: err.message || 'Audio generation failed' }, { status: 500 });
  }
}
