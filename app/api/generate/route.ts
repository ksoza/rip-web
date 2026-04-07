// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createSupabaseAdmin }       from '@/lib/supabase';
import { isNexosConfigured, nexosChat } from '@/lib/nexos';
import { logGeneration } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { showTitle, genre, creationType, idea, crossover } = body;

    if (!showTitle || !idea) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // ── Check generation limit ────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, generations_used, generations_limit')
      .eq('id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (profile.generations_used >= profile.generations_limit) {
      return NextResponse.json({
        error: 'Generation limit reached',
        upgrade: true,
        tier:    profile.tier,
        used:    profile.generations_used,
        limit:   profile.generations_limit,
      }, { status: 429 });
    }

    // ── Build prompt ──────────────────────────────────────────────
    const typeLabels: Record<string, string> = {
      episode:   'New Episode',
      scene:     'New Scene',
      ending:    'Alternate Ending',
      character: 'Add Character',
      crossover: 'Crossover',
      newscast:  'News Remix',
    };
    const typeLabel = typeLabels[creationType] || creationType;
    const isNews    = genre === 'News Show';

    const prompt = `You are an elite fan fiction and TV/film writer.

Fan-made "${typeLabel}" for: ${showTitle} (${genre})${crossover ? `\nCrossover with: ${crossover}` : ''}
User idea: ${idea}
${isNews ? 'Write as a satirical/reimagined news broadcast segment.' : ''}

Format your response EXACTLY like this:

TITLE: [Punchy all-caps creative title]

LOGLINE: [One sentence that sells it]

CONTENT:
[4-5 vivid paragraphs or script scene — true to the characters and tone of ${showTitle}, incorporating the user's idea boldly]

HASHTAGS: [12-15 hashtags: show-specific, genre, #RemixIP #RiP #FanStudio #FanFiction]

DISCLAIMER: Fan-made creation. Not affiliated with or endorsed by the creators/owners of ${showTitle}.`;

    // ── Call AI (nexos.ai gateway or direct Claude) ─────────────
    let text: string;
    const genStart = Date.now();
    let modelUsed = 'unknown';

    if (isNexosConfigured()) {
      modelUsed = 'nexos/claude-sonnet-4.5';
      const nexosResponse = await nexosChat(
        [{ role: 'user', content: prompt }],
        { model: 'claude-sonnet-4.5', max_tokens: 1024 },
      );
      text = nexosResponse.choices[0]?.message?.content || '';
    } else {
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
      }
      // Lazy init — avoids module-scope crash when env var is missing
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      modelUsed = 'claude-sonnet-4-20250514';
      const message = await anthropic.messages.create({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages:   [{ role: 'user', content: prompt }],
      });
      text = message.content.map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '').join('\n');
    }
    const genDuration = Date.now() - genStart;
    const g    = (re: RegExp) => text.match(re)?.[1]?.trim() || '';

    const result = {
      title:      g(/TITLE:\s*(.+)/),
      logline:    g(/LOGLINE:\s*(.+)/),
      content:    g(/CONTENT:\s*([\s\S]+?)(?=HASHTAGS:|DISCLAIMER:|$)/),
      hashtags:   g(/HASHTAGS:\s*(.+)/),
      disclaimer: g(/DISCLAIMER:\s*(.+)/) || `Fan-made. Not affiliated with creators of ${showTitle}.`,
    };

    // ── Save creation to DB ───────────────────────────────────────
    const { data: creation } = await supabase
      .from('creations')
      .insert({
        user_id:    userId,
        show_title: showTitle,
        genre,
        type:       typeLabel,
        title:      result.title,
        logline:    result.logline,
        content:    result.content,
        hashtags:   result.hashtags,
        is_public:  false,
      })
      .select()
      .single();

    // ── Log generation to generations table ───────────────────────
    await logGeneration({
      userId,
      creationType: typeLabel,
      model: modelUsed,
      prompt: prompt.slice(0, 500),
      result: { title: result.title, creationId: creation?.id },
      durationMs: genDuration,
      success: true,
    });

    // ── Increment generation counter ──────────────────────────────
    await supabase
      .from('profiles')
      .update({ generations_used: profile.generations_used + 1 })
      .eq('id', userId);

    return NextResponse.json({
      ...result,
      creationId: creation?.id,
      generationsLeft: profile.generations_limit - profile.generations_used - 1,
    });

  } catch (err: any) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
