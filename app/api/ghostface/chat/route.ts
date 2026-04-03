// app/api/ghostface/chat/route.ts
// GhOSTface AGI Chat — Autonomous agent with tools, planning, memory, and n8n
// Routes through nexos.ai → OpenAI → Anthropic (fallback chain)
import { NextRequest, NextResponse } from 'next/server';
import { runGhostfaceAgent, createDefaultMemory } from '@/lib/agents/ghostface-agent';
import { runAGIAgent, defaultAGIMemory } from '@/lib/agents/agi-agent';
import type { AgentMessage } from '@/lib/agents/types';

export async function POST(req: NextRequest) {
  try {
    const {
      message,
      repo,
      context,
      memory,
      history,
      mode = 'agi', // 'agi' | 'agent' | 'simple'
      config = {},
    } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Build history from client messages
    const agentHistory: AgentMessage[] = [];
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-10)) {
        if (h.role === 'user' || h.role === 'assistant') {
          agentHistory.push({ role: h.role, content: h.content });
        }
      }
    }

    // ── AGI Mode (default) — Full autonomous agent ────────────
    if (mode === 'agi') {
      const agiMemory = memory
        ? { ...defaultAGIMemory(), ...memory }
        : defaultAGIMemory();

      const result = await runAGIAgent(
        message,
        agentHistory,
        agiMemory,
        {
          maxIterations: config.maxIterations || 8,
          enablePlanning: config.enablePlanning !== false,
          enableReflection: config.enableReflection !== false,
          enableMemory: config.enableMemory !== false,
          enableN8n: config.enableN8n !== false,
          model: config.model,
          temperature: config.temperature,
        },
      );

      return NextResponse.json({
        response: result.response,
        toolsUsed: result.toolsUsed,
        plan: result.plan,
        memory: result.memory,
        reflections: result.reflections,
        mode: 'agi',
      });
    }

    // ── Agent Mode — GhOSTface with tool calling ──────────────
    if (mode === 'agent') {
      const agentMemory = memory
        ? { ...createDefaultMemory(), longTerm: { ...createDefaultMemory().longTerm, ...memory } }
        : createDefaultMemory();

      const result = await runGhostfaceAgent(
        message,
        agentHistory,
        { repo, memory, code: context },
        agentMemory,
      );

      return NextResponse.json({
        response: result.response,
        toolsUsed: result.toolsUsed,
        memory: result.memory,
        suggestedActions: result.suggestedActions,
        mode: 'agent',
      });
    }

    // ── Simple Mode — Direct API call, no tools ───────────────
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { response: '⚠️ ANTHROPIC_API_KEY not configured. Set it in Vercel environment variables.' },
        { status: 200 },
      );
    }

    let systemPrompt = `You are GhOSTface (Generative Heuristic Orchestration System — Transformative Face Engine) — an AI brain built into the RiP (Remix I.P.) platform. You provide deep technical analysis, working code, and actionable insights.

Style: Be concise but thorough. Use code blocks with language tags. Be opinionated about best practices. When generating code, make it WORKING and copy-paste ready.`;

    if (repo) {
      systemPrompt += `\n\nCurrently loaded repo: ${repo.full_name}\nDescription: ${repo.description}\nLanguage: ${repo.language}`;
    }
    if (context) {
      systemPrompt += `\n\nUser's code context:\n${context.slice(0, 3000)}`;
    }
    if (memory?.operator) {
      systemPrompt += `\n\nOperator: ${memory.operator}`;
      if (memory.stack?.length) systemPrompt += `\nStack: ${memory.stack.join(', ')}`;
    }

    const messages = agentHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    messages.push({ role: 'user', content: message });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return NextResponse.json(
        { response: `⚠️ AI error (${response.status}). Check your ANTHROPIC_API_KEY.` },
        { status: 200 },
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || 'No response generated.';

    return NextResponse.json({ response: text, mode: 'simple' });
  } catch (err: any) {
    console.error('GhOSTface chat error:', err);
    return NextResponse.json(
      { response: `⚠️ Error: ${err.message}` },
      { status: 500 },
    );
  }
}
