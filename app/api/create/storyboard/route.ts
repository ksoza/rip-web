// app/api/create/storyboard/route.ts
// AI-powered storyboard generation — Groq (free) → Anthropic (paid) fallback
// Enhanced with Showrunner-style video-optimized planning prompts
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

// ── LLM call helper — tries Groq first, then Anthropic ─────────
async function callLLM(systemPrompt: string, userPrompt: string, signal: AbortSignal) {
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

// ── Showrunner-enhanced system prompt ────────────────────────────
const STORYBOARD_SYSTEM_PROMPT = `You are a creative director and elite storyboard artist for fan-made TV/film remixes. You create vivid, cinematic visual breakdowns where each scene maps to a single AI-generated image and video clip.

OUTPUT FORMAT: Return a JSON object:
{
  "title": "Episode/Scene Title",
  "scenes": [
    {
      "sceneNum": 1,
      "description": "Brief scene summary (1-2 sentences)",
      "duration": "0:00-0:12",
      "visual": "<DETAILED image/video generation prompt>",
      "emoji": "🎬",
      "transition": "fade",
      "narration": "<optional voiceover text — 1-2 sentences>"
    }
  ]
}

VISUAL PROMPT RULES (these prompts go DIRECTLY to AI image/video generation models):
- Describe a single continuous shot per scene
- Include: subject, action/pose, setting, lighting, camera angle/movement
- Camera terms: pan, tilt, dolly, tracking shot, aerial, close-up, wide shot, medium shot, Dutch angle, bird's eye, over-the-shoulder
- Lighting: golden hour, dramatic shadows, soft diffused, neon glow, silhouette, natural, moody, high-key, rim lighting
- Style keywords: cinematic, photorealistic, film grain, shallow depth of field, anamorphic
- Composition: describe foreground/background elements, depth layers
- Keep each prompt to 2-4 sentences — specific but concise
- Do NOT mention text overlays, UI elements, charts, or programming concepts
- Do NOT use vague terms like "a scene showing" — describe what the CAMERA SEES

STORYBOARD RULES:
- Hook in first scene — visually striking opening shot
- End with a memorable visual
- Vary shot types for visual rhythm (wide → close → medium → tracking)
- Consider visual continuity between adjacent scenes
- Each transition must be one of: cut, fade, dissolve, wipe, smash_cut

Always respond with valid JSON only — no markdown, no code fences, no explanation.`;

export async function POST(req: NextRequest) {
  try {
    const {
      mediaTitle, character, prompt, tone, format,
      crossover, qaAnswers, isCustomIP, isMashup, customIPDesc,
      artStyle, artStylePrompt,
      scriptScenes,
    } = await req.json();

    if (!prompt || !character) {
      return NextResponse.json({ error: 'Missing prompt or character' }, { status: 400 });
    }

    const durationGuide: Record<string, string> = {
      short:    '60 seconds total (5 scenes, ~12s each)',
      scene:    '3 minutes total (4-5 scenes)',
      episode:  '10 minutes total (5-7 scenes, 1-2 min each)',
      music_vid: '4 minutes total (5-6 scenes)',
      trailer:  '90 seconds total (5-6 scenes, ~15s each)',
    };

    const qaContext = qaAnswers?.length
      ? qaAnswers.map((qa: { q: string; a: string }, i: number) =>
          `Q${i + 1}: ${qa.q}\nA${i + 1}: ${qa.a}`
        ).join('\n')
      : '';

    const scriptContext = scriptScenes?.length
      ? `\n\nAPPROVED SCRIPT (use these scenes as your basis):\n${scriptScenes.map((s: any) =>
          `Scene ${s.sceneNum}: ${s.heading}\nAction: ${s.action}\nDialogue: ${s.dialogue?.map((d: any) => `${d.character}: "${d.line}"`).join(', ') || 'none'}\nMood: ${s.mood}\nCamera: ${s.cameraNote}\nTransition: ${s.transition || 'cut'}`
        ).join('\n\n')}`
      : '';

    const userPrompt = `Create a detailed visual storyboard for this fan-made creation:

IP / Show: ${mediaTitle}
Character: ${character.name} (${character.role || 'main character'})
User's Vision: ${prompt}
Tone: ${tone}
Format: ${format} — ${durationGuide[format] || '60 seconds total'}
${crossover ? `Crossover with: ${crossover}` : ''}
${isCustomIP ? `Custom IP Description: ${customIPDesc}` : ''}
${isMashup ? `Mashup Mode: Combining multiple IPs` : ''}

${qaContext ? `Additional context from Q&A:\n${qaContext}` : ''}
${scriptContext}

${artStyle ? `MANDATORY ART STYLE for all scenes: ${artStyle}. Include "${artStylePrompt || artStyle}" styling in every visual description.` : ''}

The "visual" field is the MOST IMPORTANT — it will be fed directly to an AI image/video generation model. Be extremely specific about:
- Art style (use the ${artStyle || 'cinematic'} style consistently across ALL scenes)
- Camera angle and movement
- Lighting setup and mood
- Character appearance, pose, expression, clothing
- Setting details (textures, weather, time of day, objects)
- Color palette and atmosphere
- Foreground/background composition

${scriptScenes?.length ? 'Create ONE storyboard panel per script scene. Match the script closely. Carry over each scene\'s transition.' : 'Include a transition type (cut, fade, dissolve, wipe, or smash_cut) for each scene.'}

Respond with ONLY valid JSON: { "title": "...", "scenes": [...] }`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000);

    let result;
    try {
      result = await callLLM(STORYBOARD_SYSTEM_PROMPT, userPrompt, controller.signal);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return NextResponse.json(
          { error: 'Storyboard generation timed out — please try again.' },
          { status: 504 },
        );
      }
      throw err;
    }
    clearTimeout(timeout);

    let storyboard;
    try {
      storyboard = JSON.parse(result.text);
    } catch {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        storyboard = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Failed to parse AI response:', result.text.slice(0, 500));
        return NextResponse.json({ error: 'Failed to parse AI response — try again' }, { status: 500 });
      }
    }

    const scenes = (storyboard.scenes || storyboard).map((s: any) => ({
      ...s,
      transition: s.transition || 'cut',
      narration: s.narration || '',
    }));

    return NextResponse.json({
      scenes,
      title: storyboard.title || `${character.name}: ${prompt.slice(0, 50)}`,
      model: result.model,
    });

  } catch (error: any) {
    console.error('Storyboard generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Generation failed' },
      { status: error.status || 500 }
    );
  }
}
