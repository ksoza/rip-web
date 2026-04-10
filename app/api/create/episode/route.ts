// app/api/create/episode/route.ts
// Full episode pipeline — prompt → AI script → mapped scene inputs
// Client receives script + ready-to-generate scene inputs, then
// calls /api/generate/scene per scene to get video + audio
import { NextRequest, NextResponse } from 'next/server';
import {
  mapScriptToSceneInputs,
  type Script,
  type EpisodeInput,
} from '@/lib/episode-pipeline';

export const maxDuration = 60;

// ── LLM helper (Groq → Anthropic fallback) ────────────────────

async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal,
) {
  // Priority 1 — Groq (free tier)
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 4096,
        temperature: 0.8,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal,
    });
    if (res.ok) {
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        model: 'groq/llama-4-scout',
      };
    }
    console.warn('[episode] Groq failed:', res.status);
  }

  // Priority 2 — Anthropic (paid)
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: anthropicKey });
    const msg = await client.messages.create(
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      },
      { signal },
    );
    const text = msg.content
      .map((b: any) => (b.type === 'text' ? b.text : ''))
      .join('\n');
    return { text, model: 'anthropic/claude-sonnet-4' };
  }

  throw new Error(
    'No AI provider configured. Set GROQ_API_KEY or ANTHROPIC_API_KEY.',
  );
}

// ── Episode-optimised script prompt ───────────────────────────

function buildEpisodePrompt(input: EpisodeInput) {
  const durationGuide: Record<string, string> = {
    short:     '60 seconds (3-4 scenes, ~15 s each)',
    scene:     '2-3 minutes (4-5 scenes)',
    episode:   '10-15 minutes (6-8 scenes, 1-2 min each)',
    trailer:   '90 seconds (5-6 quick cuts)',
    music_vid: '3-4 minutes (5-6 visual scenes)',
  };

  return `Write a screenplay for this fan-made AI-generated creation:

Show / IP: ${input.show}
Characters: ${input.characters.join(', ')}
Episode Idea: ${input.prompt}
Format: ${input.format} — ${durationGuide[input.format] || '60 seconds'}
Art Style: ${input.artStyle}

CRITICAL RULES:
- Characters SPEAK as themselves with authentic voices and mannerisms
- NO narrator, NO voiceover — all audio comes from characters talking + ambient sound
- Every scene must have dialogue — characters reacting, arguing, joking, etc.
- Write the way the show actually sounds — match the tone, humour, pacing
- Each scene is a SINGLE CONTINUOUS SHOT (generated as one video clip)
- Keep each scene 5-16 seconds of screen time
- Dialogue should be punchy: 1-3 lines per character per scene

Generate a screenplay as JSON:
{
  "title": "Episode title",
  "logline": "One-line summary",
  "scenes": [
    {
      "sceneNum": 1,
      "heading": "INT./EXT. LOCATION - TIME",
      "description": "Brief scene summary",
      "action": "What we SEE. Cinematic, visual. 2-3 sentences.",
      "dialogue": [
        { "character": "CHARACTER_NAME", "line": "What they say", "direction": "how they say it" }
      ],
      "duration": "0:00-0:12",
      "mood": "tense/funny/eerie/etc",
      "cameraNote": "e.g. SLOW PUSH IN, TRACKING SHOT, WIDE ESTABLISHING",
      "transition": "cut | fade | dissolve | smash_cut"
    }
  ]
}

Generate ${
    input.format === 'short'
      ? '3-4'
      : input.format === 'episode'
        ? '6-8'
        : '4-6'
  } scenes.
Respond with ONLY valid JSON.`;
}

// ── POST handler ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const input: EpisodeInput = {
      show:        body.show,
      artStyle:    body.artStyle || 'source-faithful',
      characters:  body.characters || [],
      prompt:      body.prompt,
      format:      body.format || 'short',
      aspectRatio: body.aspectRatio,
      model:       body.model,
    };

    if (!input.prompt || !input.show) {
      return NextResponse.json(
        { error: 'Missing prompt or show' },
        { status: 400 },
      );
    }
    if (!input.characters.length) {
      return NextResponse.json(
        { error: 'Select at least one character' },
        { status: 400 },
      );
    }

    // ── Generate script via LLM ─────────────────────────────
    const systemPrompt = `You are a professional TV screenwriter creating fan-made remix episodes. Write vivid, authentic screenplays where characters speak in their own voices. CRITICAL: No narration, no voiceover. Characters talk as themselves. Respond with valid JSON only.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55_000);

    let result;
    try {
      result = await callLLM(
        systemPrompt,
        buildEpisodePrompt(input),
        controller.signal,
      );
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Script generation timed out — try a shorter format' },
          { status: 504 },
        );
      }
      throw err;
    }
    clearTimeout(timeout);

    // ── Parse script JSON ───────────────────────────────────
    let script: Script;
    try {
      script = JSON.parse(result.text);
    } catch {
      const match = result.text.match(/\{[\s\S]*\}/);
      if (match) {
        script = JSON.parse(match[0]);
      } else {
        return NextResponse.json(
          { error: 'Failed to parse AI script — try again' },
          { status: 500 },
        );
      }
    }
    script.model = result.model;

    // ── Map script → scene pipeline inputs ──────────────────
    const sceneInputs = mapScriptToSceneInputs(script, input);

    return NextResponse.json({
      script: {
        title:   script.title || `${input.show}: ${input.prompt.slice(0, 50)}`,
        logline: script.logline || '',
        scenes:  script.scenes || [],
        model:   script.model,
      },
      sceneInputs: sceneInputs.map((si) => ({
        show:             si.show,
        artStyle:         si.artStyle,
        sceneDescription: si.sceneDescription,
        dialogue:         si.dialogue,
        characters:       si.characters,
        duration:         si.duration,
        aspectRatio:      si.aspectRatio,
        model:            si.model,
      })),
      totalScenes: script.scenes?.length || 0,
    });
  } catch (error: any) {
    console.error('[episode] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Episode generation failed' },
      { status: 500 },
    );
  }
}
