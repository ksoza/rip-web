// app/api/create/storyboard/route.ts
// AI-powered storyboard generation using Anthropic Claude SDK
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const {
      mediaTitle, character, prompt, tone, format,
      crossover, qaAnswers, isCustomIP, isMashup, customIPDesc,
      artStyle, artStylePrompt,
    } = await req.json();

    if (!prompt || !character) {
      return NextResponse.json({ error: 'Missing prompt or character' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    // Build the duration guide based on format
    const durationGuide: Record<string, string> = {
      short:    '60 seconds total (5 scenes, ~12s each)',
      episode:  '10 minutes total (5-7 scenes, 1-2 min each)',
      feature:  '30 minutes total (7-10 scenes, 3-5 min each)',
      clip:     '30 seconds total (3-4 scenes, ~8s each)',
      trailer:  '90 seconds total (5-6 scenes, ~15s each)',
      series:   '20 minutes total (8-10 scenes, 2-3 min each)',
    };

    const qaContext = qaAnswers?.length
      ? qaAnswers.map((qa: { q: string; a: string }, i: number) =>
          `Q${i + 1}: ${qa.q}\nA${i + 1}: ${qa.a}`
        ).join('\n')
      : '';

    const systemPrompt = `You are an elite storyboard writer for fan-made TV/film remixes. You create vivid, cinematic scene breakdowns that can guide AI image and video generation.

Always respond with valid JSON only — no markdown, no code fences, no explanation.`;

    const userPrompt = `Create a detailed storyboard for this fan-made creation:

IP / Show: ${mediaTitle}
Character: ${character.name} (${character.role || 'main character'})
User's Vision: ${prompt}
Tone: ${tone}
Format: ${format} — ${durationGuide[format] || '60 seconds total'}
${crossover ? `Crossover with: ${crossover}` : ''}
${isCustomIP ? `Custom IP Description: ${customIPDesc}` : ''}
${isMashup ? `Mashup Mode: Combining multiple IPs` : ''}

${qaContext ? `Additional context from Q&A:\n${qaContext}` : ''}

Generate a storyboard as a JSON object. Each scene needs:
- sceneNum (number)
- description (2-3 sentences describing what happens)
- duration (time range like "0:00-0:12")
- visual (detailed visual description for AI image generation — describe camera angle, lighting, colors, composition, character poses/expressions)
- emoji (single relevant emoji)

The visual field is CRITICAL — it will be fed directly to an image generation AI.
${artStyle ? `MANDATORY ART STYLE for all scenes: ${artStyle}. Include "${artStylePrompt || artStyle}" styling in every visual description.` : ''}
Be specific about:
- Art style (use the ${artStyle || 'cinematic'} style consistently across ALL scenes)
- Camera angle (wide shot, close-up, bird's eye, etc.)
- Lighting (dramatic shadows, golden hour, neon glow, etc.)
- Character appearance and expression
- Setting details

Respond with ONLY valid JSON: { "scenes": [...], "title": "..." }`;

    // Call Claude using the SDK (same pattern as generate/route.ts)
    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    });

    const textContent = message.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('\n');

    // Parse JSON from response
    let storyboard;
    try {
      storyboard = JSON.parse(textContent);
    } catch {
      // Try to extract JSON from response
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        storyboard = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Failed to parse AI response:', textContent.slice(0, 500));
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
      }
    }

    return NextResponse.json({
      scenes: storyboard.scenes || storyboard,
      title: storyboard.title || `${character.name}: ${prompt.slice(0, 50)}`,
    });

  } catch (error: any) {
    console.error('Storyboard generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Generation failed' },
      { status: error.status || 500 }
    );
  }
}
