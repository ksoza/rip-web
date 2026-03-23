// app/api/ghoku/chat/route.ts
// Gh.O.K.U. Oracle Chat — AI-powered repo analysis and code generation
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message, repo, context, memory, history } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { response: '⚠️ ANTHROPIC_API_KEY not configured. Set it in Vercel environment variables.' },
        { status: 200 }
      );
    }

    // Build system prompt based on context
    let systemPrompt = `You are Gh.O.K.U. (GitHub Oracle Kinetic Unit) — an AI brain that searches, scans, and synthesizes GitHub repos in real time. You provide deep technical analysis, working code, and actionable insights.

Style: Be concise but thorough. Use code blocks with language tags. Be opinionated about best practices. When generating code, make it WORKING and copy-paste ready — no placeholders, no "fill this in" comments.`;

    if (repo) {
      systemPrompt += `\n\nCurrently loaded repo: ${repo.full_name}
Description: ${repo.description}
Stars: ${repo.stars} | Forks: ${repo.forks} | Issues: ${repo.issues}
Primary language: ${repo.language}
Languages: ${JSON.stringify(repo.languages)}
Topics: ${repo.topics?.join(', ')}
License: ${repo.license}
Contributors: ${repo.contributors?.map((c: any) => c.login).join(', ')}
README (first 2000 chars): ${repo.readme?.slice(0, 2000)}`;
    }

    if (context) {
      systemPrompt += `\n\nUser's project context/code:\n${context}`;
    }

    if (memory?.operator) {
      systemPrompt += `\n\nOperator: ${memory.operator}`;
      if (memory.stack?.length) systemPrompt += `\nStack: ${memory.stack.join(', ')}`;
      if (memory.languages?.length) systemPrompt += `\nLanguages: ${memory.languages.join(', ')}`;
      if (memory.apis?.length) systemPrompt += `\nAPIs: ${memory.apis.join(', ')}`;
      if (memory.projects?.length) systemPrompt += `\nProjects: ${memory.projects.join(', ')}`;
    }

    // Build message history
    const messages = [];
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-8)) {
        if (h.role === 'user') {
          messages.push({ role: 'user', content: h.content });
        } else if (h.role === 'assistant') {
          messages.push({ role: 'assistant', content: h.content });
        }
      }
    }
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
        { status: 200 }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || 'No response generated.';

    return NextResponse.json({ response: text });
  } catch (err: any) {
    console.error('GhOKU chat error:', err);
    return NextResponse.json(
      { response: `⚠️ Error: ${err.message}` },
      { status: 500 }
    );
  }
}
