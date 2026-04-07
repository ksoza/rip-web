// app/api/diagnostic/route.ts
// Deep health check — no auth required
// Tests env vars, Anthropic connectivity, and raw HTTP to isolate issues
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function GET() {
  const checks: Record<string, string> = {};

  // 1. Check env vars exist (show key prefix/suffix for debugging, not full value)
  const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
  const falKey = process.env.FAL_KEY || '';

  checks.ANTHROPIC_API_KEY = anthropicKey
    ? `set (${anthropicKey.length} chars) prefix="${anthropicKey.slice(0, 10)}..." suffix="...${anthropicKey.slice(-4)}"`
    : 'MISSING';
  checks.FAL_KEY = falKey ? `set (${falKey.length} chars)` : 'MISSING';
  checks.HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY ? 'set' : 'MISSING';
  checks.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING';
  checks.SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'MISSING';
  checks.NODE_VERSION = process.version;
  checks.VERCEL_REGION = process.env.VERCEL_REGION || 'unknown';

  // 2. DNS + raw HTTP test to Anthropic (bypass SDK entirely)
  if (anthropicKey) {
    try {
      const start = Date.now();
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey.trim(),
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 16,
          messages: [{ role: 'user', content: 'Say OK' }],
        }),
      });
      const elapsed = Date.now() - start;
      const body = await res.text();
      checks.anthropic_raw_fetch = `HTTP ${res.status} in ${elapsed}ms — ${body.slice(0, 200)}`;
    } catch (e: any) {
      checks.anthropic_raw_fetch = `FAILED: ${e.name}: ${e.message}`;
    }
  }

  // 3. SDK test (if raw fetch worked)
  if (anthropicKey) {
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: anthropicKey.trim() });
      const start = Date.now();
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16,
        messages: [{ role: 'user', content: 'Say "OK" and nothing else.' }],
      });
      const elapsed = Date.now() - start;
      const text = msg.content.map((b: any) => b.text || '').join('');
      checks.anthropic_sdk = `OK in ${elapsed}ms — "${text.trim()}"`;
    } catch (e: any) {
      checks.anthropic_sdk = `FAILED: ${e.name}: ${e.message}`;
    }
  }

  // 4. General outbound connectivity test
  try {
    const start = Date.now();
    const res = await fetch('https://httpbin.org/get');
    const elapsed = Date.now() - start;
    checks.outbound_https = `OK (${res.status}) in ${elapsed}ms`;
  } catch (e: any) {
    checks.outbound_https = `FAILED: ${e.message}`;
  }

  return NextResponse.json({ ts: new Date().toISOString(), checks });
}
