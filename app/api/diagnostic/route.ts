// app/api/diagnostic/route.ts
// Quick health check — no auth required
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function GET() {
  const checks: Record<string, string> = {};

  // 1. Check env vars exist (don't leak values)
  checks.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ? `set (${process.env.ANTHROPIC_API_KEY.length} chars)` : 'MISSING';
  checks.FAL_KEY = process.env.FAL_KEY ? `set (${process.env.FAL_KEY.length} chars)` : 'MISSING';
  checks.HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY ? `set` : 'MISSING';
  checks.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING';
  checks.SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'MISSING';

  // 2. Quick Anthropic ping
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const start = Date.now();
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 32,
        messages: [{ role: 'user', content: 'Say "OK" and nothing else.' }],
      });
      const elapsed = Date.now() - start;
      const text = msg.content.map((b: any) => b.text || '').join('');
      checks.anthropic_ping = `OK in ${elapsed}ms — "${text.trim()}"`;
    } catch (e: any) {
      checks.anthropic_ping = `FAILED: ${e.message}`;
    }
  }

  return NextResponse.json({ ts: new Date().toISOString(), checks });
}
