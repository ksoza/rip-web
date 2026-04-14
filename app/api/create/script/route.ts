// app/api/create/script/route.ts
// AI-powered screenplay generation — Groq (free) → Anthropic (paid) fallback
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

// ── LLM call helper — tries Groq first, then Anthropic ─────────
async function callLLM(systemPrompt: string, userPrompt: string, signal: AbortSignal) {
  // Priority 1: Groq (free tier — Llama 4 Scout)
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 2048,
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
      return { text: data.choices?.[0]?.message?.content || '', model: 'groq/llama-4-scout' };
    }
    console.warn('Groq failed:', res.status, await res.text().catch(() => ''));
  }

  // Priority 2: Anthropic (paid)
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: anthropicKey });
    const msg = await client.messages.create(
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      },
      { signal },
    );
    const text = msg.content.map((b: any) => b.type === 'text' ? b.text : '').join('\n');
    return { text, model: 'anthropic/claude-sonnet-4' };
  }

  throw new Error('No AI provider configured. Set GROQ_API_KEY or ANTHROPIC_API_KEY in Vercel.');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Accept both field names — wizard sends personalCharacter, legacy sends character
    const {
      mediaTitle, prompt, tone, format,
      crossover, qaAnswers, isCustomIP, isMashup, customIPDesc,
      personalCharacter, character: characterRaw,
      characterImageUrl, hasMusicUpload,
    } = body;

    // Normalize character — accept string or object { name, role }
    const character = (() => {
      const raw = characterRaw || personalCharacter;
      if (!raw) return null;
      if (typeof raw === 'string') return { name: raw, role: 'main character' };
      return { name: raw.name || 'Character', role: raw.role || 'main character' };
    })();

    if (!prompt && !character) {
      return NextResponse.json({ error: 'Missing prompt or character' }, { status: 400 });
    }

    // Use prompt alone if no character, or character alone if no prompt
    const charName = character?.name || 'Original Character';
    const charRole = character?.role || 'main character';
    const userIdea = prompt || `A story about ${charName}`;

    const durationGuide: Record<string, string> = {
      short:     '60 seconds (3-4 scenes, punchy)',
      scene:     '2-3 minutes (4-5 scenes)',
      episode:   '10-15 minutes (6-8 scenes)',
      music_vid: '3-4 minutes (5-6 visual scenes with music cues)',
      trailer:   '90 seconds (5-6 quick cuts)',
    };

    const qaContext = qaAnswers?.length
      ? qaAnswers.map((qa: { q: string; a: string }, i: number) =>
          `Q${i + 1}: ${qa.q}\nA${i + 1}: ${qa.a}`
        ).join('\n')
      : '';

    const systemPrompt = `You are a professional screenwriter creating fan-made remix scripts. You write vivid, cinematic screenplays with proper formatting: scene headings (INT./EXT.), action lines, character dialogue with parenthetical direction, and camera notes.

CRITICAL: Respond with valid JSON only — no markdown, no code fences, no explanation outside the JSON structure.`;

    const userPrompt = `Write a screenplay for this fan-made creation:

IP / Show: ${mediaTitle || 'Original Creation'}
Main Character: ${charName} (${charRole})
User's Vision: ${userIdea}
Tone: ${tone || 'Dramatic'}
Format: ${format || 'short'} — ${durationGuide[format] || '60 seconds total'}
${crossover ? `Crossover with: ${crossover}` : ''}
${isCustomIP ? `Original IP Description: ${customIPDesc}` : ''}
${isMashup ? `Mashup Mode: Combining multiple IPs` : ''}
${characterImageUrl ? `Character reference image provided — incorporate visual details into scene descriptions.` : ''}
${hasMusicUpload ? `User is providing their own music track — write scenes that sync well with music beats and rhythm changes.` : ''}

${qaContext ? `Additional context from creator Q&A:\n${qaContext}` : ''}

Generate a screenplay as JSON with this EXACT structure:
{
  "title": "Episode/scene title",
  "logline": "One-line summary",
  "scenes": [
    {
      "sceneNum": 1,
      "heading": "INT. LOCATION - TIME OF DAY",
      "description": "Brief scene summary (1-2 sentences)",
      "action": "Detailed action description — what we SEE happening. Write cinematically. 3-5 sentences.",
      "dialogue": [
        {
          "character": "CHARACTER NAME",
          "line": "What they say",
          "direction": "how they say it (optional)"
        }
      ],
      "duration": "0:00-0:15",
      "mood": "tense/funny/eerie/hopeful/etc",
      "cameraNote": "Camera direction — e.g. 'SLOW PUSH IN on face' or 'TRACKING SHOT through hallway'",
      "transition": "cut | fade | dissolve | wipe | smash_cut"
    }
  ]
}

Requirements:
- Each scene MUST have a proper INT./EXT. heading
- Dialogue should feel authentic to the characters from ${mediaTitle || 'the source material'}
- Action lines should be vivid and visual — describe what the CAMERA sees
- Camera notes should be specific and cinematic
- Duration timestamps should be sequential and match the format
- Each scene MUST include a "transition" field (cut, fade, dissolve, wipe, or smash_cut)
- This is a FAN-MADE remix — be creative but respect the source material's spirit
- Generate ${format === 'short' ? '3-4' : format === 'episode' ? '6-8' : '4-6'} scenes

Respond with ONLY the JSON object.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000);

    let result;
    try {
      result = await callLLM(systemPrompt, userPrompt, controller.signal);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return NextResponse.json(
          { error: 'Script generation timed out — please try a shorter format or try again.' },
          { status: 504 },
        );
      }
      throw err;
    }
    clearTimeout(timeout);

    // Parse JSON from response
    let script;
    try {
      script = JSON.parse(result.text);
    } catch {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        script = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Failed to parse script response:', result.text.slice(0, 500));
        return NextResponse.json({ error: 'Failed to parse AI script — try again' }, { status: 500 });
      }
    }

    return NextResponse.json({
      title: script.title || `${charName}: ${userIdea.slice(0, 50)}`,
      logline: script.logline || '',
      scenes: script.scenes || [],
      model: result.model,
    });

  } catch (error: any) {
    console.error('Script generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Script generation failed' },
      { status: error.status || 500 }
    );
  }
}
