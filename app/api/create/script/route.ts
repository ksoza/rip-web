// app/api/create/script/route.ts
// AI-powered screenplay generation using Anthropic Claude
// Generates a full script with scene headings, dialogue, action, camera notes
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const {
      mediaTitle, character, prompt, tone, format,
      crossover, qaAnswers, isCustomIP, isMashup, customIPDesc,
    } = await req.json();

    if (!prompt || !character) {
      return NextResponse.json({ error: 'Missing prompt or character' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    // Lazy init — avoids module-scope crash when env var is missing
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

    // Duration guides per format
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

IP / Show: ${mediaTitle}
Main Character: ${character.name} (${character.role || 'main character'})
User's Vision: ${prompt}
Tone: ${tone}
Format: ${format} — ${durationGuide[format] || '60 seconds total'}
${crossover ? `Crossover with: ${crossover}` : ''}
${isCustomIP ? `Original IP Description: ${customIPDesc}` : ''}
${isMashup ? `Mashup Mode: Combining multiple IPs` : ''}

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
- Dialogue should feel authentic to the characters from ${mediaTitle}
- Action lines should be vivid and visual — describe what the CAMERA sees
- Camera notes should be specific and cinematic
- Duration timestamps should be sequential and match the format
- Each scene MUST include a "transition" field (cut, fade, dissolve, wipe, or smash_cut)
- This is a FAN-MADE remix — be creative but respect the source material's spirit
- Generate ${format === 'short' ? '3-4' : format === 'episode' ? '6-8' : '4-6'} scenes

Respond with ONLY the JSON object.`;

    // Timeout guard: abort the Anthropic call before Vercel kills the function
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000); // 50s safety net

    let message;
    try {
      message = await anthropic.messages.create(
        {
          model:      'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system:     systemPrompt,
          messages:   [{ role: 'user', content: userPrompt }],
        },
        { signal: controller.signal },
      );
    } catch (abortErr: any) {
      clearTimeout(timeout);
      if (abortErr.name === 'AbortError' || controller.signal.aborted) {
        return NextResponse.json(
          { error: 'Script generation timed out — please try a shorter format or try again.' },
          { status: 504 },
        );
      }
      throw abortErr; // re-throw non-timeout errors
    }
    clearTimeout(timeout);

    const textContent = message.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('\n');

    // Parse JSON from response
    let script;
    try {
      script = JSON.parse(textContent);
    } catch {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        script = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Failed to parse script response:', textContent.slice(0, 500));
        return NextResponse.json({ error: 'Failed to parse AI script' }, { status: 500 });
      }
    }

    return NextResponse.json({
      title: script.title || `${character.name}: ${prompt.slice(0, 50)}`,
      logline: script.logline || '',
      scenes: script.scenes || [],
    });

  } catch (error: any) {
    console.error('Script generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Script generation failed' },
      { status: error.status || 500 }
    );
  }
}
