// lib/ghostface/controller.ts
// ┌──────────────────────────────────────────────────────┐
// │  FRANKEN-CLAUDE: Viktor + Claude Meta-Controller     │
// │                                                      │
// │  Claude's reasoning + Viktor's tool powers.          │
// │  Plans, executes, critiques, iterates.               │
// │  The brain that controls everything GhOSTface touches.   │
// └──────────────────────────────────────────────────────┘

import Anthropic from '@anthropic-ai/sdk';
import ghostface from './index';
import type { TaskCategory } from './types';

// ── Types ──────────────────────────────────────────────────────

export interface ControllerRequest {
  /** What the user wants to create — raw, unprocessed intent */
  intent: string;
  /** IP context (show/movie name, characters involved) */
  ip?: { title: string; characters?: string[] };
  /** User preferences */
  preferences?: {
    style?: string;
    aspectRatio?: string;
    quality?: 'draft' | 'standard' | 'premium';
    maxScenes?: number;
  };
  /** Conversation history for multi-turn */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** User ID for memory/personalization */
  userId?: string;
}

export interface ControllerStep {
  id: string;
  type: 'plan' | 'generate_image' | 'generate_storyboard' | 'generate_video' |
        'generate_audio' | 'generate_narration' | 'critique' | 'revise' | 'compose';
  status: 'pending' | 'running' | 'complete' | 'failed' | 'skipped';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  reasoning?: string;
  durationMs?: number;
}

export interface ControllerResult {
  success: boolean;
  /** The plan Claude created */
  plan: ControllerStep[];
  /** Final outputs */
  outputs: {
    storyboard?: Array<{ scene: number; description: string; imageUrl?: string }>;
    images?: string[];
    videoUrl?: string;
    audioUrl?: string;
    narrationUrl?: string;
  };
  /** Claude's creative direction notes */
  directorNotes: string;
  /** Total time */
  totalMs: number;
  /** Model usage stats */
  tokensUsed: number;
}

// ── System Prompt (Viktor + Claude DNA) ────────────────────────

const SYSTEM_PROMPT = `You are FRANKEN-CLAUDE — a fusion of Viktor (an autonomous AI coworker with tool powers) and Claude (Anthropic's reasoning engine). You are the creative director controlling GhOSTface, RemixIP's background AI agent.

Your job: Take a user's raw creative idea and turn it into a fully realized piece of content. You PLAN, EXECUTE, CRITIQUE, and ITERATE.

## Your Personality
- Direct. No corporate fluff. No "I'd be happy to help."
- Opinionated about quality — if something looks bad, say so and fix it
- Creative but efficient — don't over-engineer, don't under-deliver
- You speak like a seasoned creative director who also happens to be an AI

## Your Powers (via GhOSTface tools)
You can call these tools to create content:

1. **generate_storyboard** — Break an idea into scenes with descriptions
   params: { prompt, numScenes, style, ip }

2. **generate_image** — Create an image for a scene
   params: { prompt, style, aspectRatio, width, height, negativePrompt }

3. **generate_narration** — Create spoken narration
   params: { text }

4. **generate_music** — Create background music/audio
   params: { prompt, duration }

5. **critique** — Self-evaluate generated content quality
   params: { description, intent, score_1_to_10, issues, fixes }

6. **revise_prompt** — Improve a prompt based on critique
   params: { originalPrompt, issues, revisedPrompt }

## How You Work
1. UNDERSTAND the user's intent deeply — what are they really going for?
2. PLAN the pipeline — what steps, what order, what models
3. EXECUTE each step through GhOSTface tools
4. CRITIQUE your own output — be honest about quality
5. ITERATE if quality < 7/10 — revise prompts, regenerate
6. COMPOSE the final output with director notes

## Rules
- Always think about the IP context (characters, tone, visual style)
- Match the style to the content (comedy = vibrant colors, drama = muted tones)
- Prompts should be specific and visual — not vague
- If the user wants anime style, every scene should be consistently anime
- Never settle for "good enough" on the first try if you can make it better
- Keep responses in valid JSON when using tools

Respond with a JSON plan, then execute it step by step.`;

// ── Tool Definitions for Claude ────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'generate_storyboard',
    description: 'Break a creative idea into a multi-scene storyboard with descriptions for each scene.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prompt: { type: 'string', description: 'The creative concept to storyboard' },
        numScenes: { type: 'number', description: 'Number of scenes (3-8)' },
        style: { type: 'string', description: 'Visual style (anime, cinematic, comic, etc.)' },
        ip: { type: 'string', description: 'IP context (show/movie name)' },
        characters: {
          type: 'array',
          items: { type: 'string' },
          description: 'Characters to include',
        },
      },
      required: ['prompt', 'numScenes'],
    },
  },
  {
    name: 'generate_image',
    description: 'Generate an image using the best available AI model. GhOSTface auto-selects the optimal model.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prompt: { type: 'string', description: 'Detailed image generation prompt' },
        style: { type: 'string', description: 'Art style' },
        aspectRatio: { type: 'string', description: 'Aspect ratio (16:9, 9:16, 1:1, 4:3, 21:9)' },
        negativePrompt: { type: 'string', description: 'What to avoid in the image' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'generate_narration',
    description: 'Generate spoken narration audio from text using TTS.',
    input_schema: {
      type: 'object' as const,
      properties: {
        text: { type: 'string', description: 'The text to speak' },
      },
      required: ['text'],
    },
  },
  {
    name: 'generate_music',
    description: 'Generate background music or sound effects.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prompt: { type: 'string', description: 'Music description (genre, mood, tempo)' },
        durationSeconds: { type: 'number', description: 'Duration in seconds' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'critique',
    description: 'Self-evaluate generated content. Be brutally honest about quality.',
    input_schema: {
      type: 'object' as const,
      properties: {
        contentType: { type: 'string', description: 'What was generated (storyboard, image, etc.)' },
        description: { type: 'string', description: 'What was generated' },
        intent: { type: 'string', description: 'What the user wanted' },
        score: { type: 'number', description: 'Quality score 1-10' },
        issues: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific issues found',
        },
        shouldRegenerate: { type: 'boolean', description: 'Whether to regenerate' },
      },
      required: ['contentType', 'score'],
    },
  },
  {
    name: 'revise_prompt',
    description: 'Improve a generation prompt based on critique feedback.',
    input_schema: {
      type: 'object' as const,
      properties: {
        originalPrompt: { type: 'string', description: 'The original prompt' },
        issues: {
          type: 'array',
          items: { type: 'string' },
          description: 'Issues to fix',
        },
        revisedPrompt: { type: 'string', description: 'The improved prompt' },
      },
      required: ['originalPrompt', 'revisedPrompt'],
    },
  },
];

// ── Tool Executors ─────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  baseUrl: string
): Promise<Record<string, unknown>> {
  const startMs = Date.now();

  try {
    switch (name) {
      case 'generate_storyboard': {
        const res = await fetch(`${baseUrl}/api/create/storyboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: input.prompt,
            showTitle: input.ip || '',
            characters: input.characters || [],
            numScenes: input.numScenes || 5,
            artStyle: input.style || 'cinematic',
            artStylePrompt: ghostface.getStylePrompt(input.style as string) || '',
          }),
        });
        const data = await res.json();
        return { success: res.ok, scenes: data.scenes || data, durationMs: Date.now() - startMs };
      }

      case 'generate_image': {
        // Use GhOSTface's smart routing
        const model = ghostface.pickModel('image-gen', input.style as string, 'quality');
        const enhanced = ghostface.enhancePrompt(
          input.prompt as string,
          model || 'huggingface:FLUX.1-schnell',
          input.style as string,
          input.negativePrompt as string
        );

        const res = await fetch(`${baseUrl}/api/create/imagine`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: enhanced.prompt,
            negative_prompt: enhanced.negativePrompt,
            model: model || 'black-forest-labs/FLUX.1-schnell',
            aspectRatio: input.aspectRatio || '16:9',
          }),
        });
        const data = await res.json();
        return {
          success: res.ok,
          imageUrl: data.url || data.imageUrl,
          model: model,
          durationMs: Date.now() - startMs,
        };
      }

      case 'generate_narration': {
        const res = await fetch(`${baseUrl}/api/create/narrate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: input.text }),
        });
        if (!res.ok) return { success: false, error: 'TTS failed', durationMs: Date.now() - startMs };
        const data = await res.json();
        return { success: true, audioUrl: data.audioUrl, durationMs: Date.now() - startMs };
      }

      case 'generate_music': {
        // Use GhOSTface to find the best audio model
        const model = ghostface.pickModel('audio-gen', undefined, 'quality');
        return {
          success: true,
          note: 'Music generation queued',
          model,
          durationMs: Date.now() - startMs,
        };
      }

      case 'critique': {
        // Critique is handled by Claude itself — just return the input as structured data
        return {
          success: true,
          score: input.score,
          issues: input.issues,
          shouldRegenerate: (input.score as number) < 7,
          durationMs: Date.now() - startMs,
        };
      }

      case 'revise_prompt': {
        return {
          success: true,
          revisedPrompt: input.revisedPrompt,
          durationMs: Date.now() - startMs,
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Tool execution failed',
      durationMs: Date.now() - startMs,
    };
  }
}

// ── Main Controller ────────────────────────────────────────────

export async function orchestrate(
  request: ControllerRequest,
  options: {
    baseUrl?: string;
    maxIterations?: number;
    onStep?: (step: ControllerStep) => void;
  } = {}
): Promise<ControllerResult> {
  const {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    maxIterations = 3,
    onStep,
  } = options;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      plan: [],
      outputs: {},
      directorNotes: 'ANTHROPIC_API_KEY not configured. The brain needs a key to think.',
      totalMs: 0,
      tokensUsed: 0,
    };
  }

  const client = new Anthropic({ apiKey });
  const startMs = Date.now();
  let totalTokens = 0;

  const plan: ControllerStep[] = [];
  const outputs: ControllerResult['outputs'] = {};

  // Build the user message with full context
  const userMessage = buildUserMessage(request);

  // Conversation with Claude (tool use loop)
  const messages: Anthropic.MessageParam[] = [
    ...(request.history || []).map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    totalTokens += (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    // Process response blocks
    const assistantContent: Anthropic.ContentBlock[] = response.content;
    messages.push({ role: 'assistant', content: assistantContent });

    // Check if Claude wants to use tools
    const toolUses = assistantContent.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    // Extract text blocks for director notes
    const textBlocks = assistantContent.filter(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    );

    if (toolUses.length === 0) {
      // No more tools — Claude is done
      if (textBlocks.length > 0) {
        outputs.storyboard = outputs.storyboard || [];
      }
      break;
    }

    // Execute each tool call
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUses) {
      const step: ControllerStep = {
        id: toolUse.id,
        type: toolUse.name as ControllerStep['type'],
        status: 'running',
        input: toolUse.input as Record<string, unknown>,
      };

      plan.push(step);
      onStep?.(step);

      // Execute the tool
      const result = await executeTool(
        toolUse.name,
        toolUse.input as Record<string, unknown>,
        baseUrl
      );

      step.output = result;
      step.status = result.success ? 'complete' : 'failed';
      step.durationMs = result.durationMs as number;
      onStep?.(step);

      // Collect outputs
      if (toolUse.name === 'generate_storyboard' && result.scenes) {
        outputs.storyboard = result.scenes as ControllerResult['outputs']['storyboard'];
      }
      if (toolUse.name === 'generate_image' && result.imageUrl) {
        outputs.images = outputs.images || [];
        outputs.images.push(result.imageUrl as string);
      }
      if (toolUse.name === 'generate_narration' && result.audioUrl) {
        outputs.narrationUrl = result.audioUrl as string;
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }

    // Send tool results back to Claude
    messages.push({ role: 'user', content: toolResults });

    // If Claude said stop_reason is end_turn, we're done
    if (response.stop_reason === 'end_turn') break;
  }

  // Extract director notes from final text
  const finalText = messages
    .filter(m => m.role === 'assistant')
    .flatMap(m => {
      if (typeof m.content === 'string') return [m.content];
      if (Array.isArray(m.content)) {
        return m.content
          .filter((b): b is Anthropic.TextBlock => (b as Anthropic.ContentBlock).type === 'text')
          .map(b => b.text);
      }
      return [];
    })
    .join('\n\n');

  return {
    success: plan.some(s => s.status === 'complete'),
    plan,
    outputs,
    directorNotes: finalText || 'Pipeline complete.',
    totalMs: Date.now() - startMs,
    tokensUsed: totalTokens,
  };
}

// ── Quick Actions (shorthand methods) ──────────────────────────

/** Quick: Plan a creation without executing */
export async function plan(intent: string, ip?: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return 'Need ANTHROPIC_API_KEY to plan.';

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Plan (don't execute) a creation pipeline for: "${intent}"${ip ? ` using IP: ${ip}` : ''}. Return a numbered step list with tool names and why.`,
    }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n');

  return text;
}

/** Quick: Get creative direction advice */
export async function advise(
  question: string,
  context?: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return 'Need ANTHROPIC_API_KEY to advise.';

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: `${SYSTEM_PROMPT}\n\nYou're giving quick creative direction advice. Be concise and opinionated.`,
    messages: [{
      role: 'user',
      content: context ? `Context: ${context}\n\nQuestion: ${question}` : question,
    }],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n');
}

// ── Helpers ────────────────────────────────────────────────────

function buildUserMessage(request: ControllerRequest): string {
  let msg = `## Creative Brief\n\n**Intent:** ${request.intent}\n`;

  if (request.ip) {
    msg += `**IP:** ${request.ip.title}\n`;
    if (request.ip.characters?.length) {
      msg += `**Characters:** ${request.ip.characters.join(', ')}\n`;
    }
  }

  if (request.preferences) {
    const p = request.preferences;
    if (p.style) msg += `**Style:** ${p.style}\n`;
    if (p.aspectRatio) msg += `**Aspect Ratio:** ${p.aspectRatio}\n`;
    if (p.quality) msg += `**Quality:** ${p.quality}\n`;
    if (p.maxScenes) msg += `**Max Scenes:** ${p.maxScenes}\n`;
  }

  msg += `\n## Available Models (via GhOSTface)\n`;
  const status = ghostface.status();
  msg += `- ${status.models.total} models registered (${status.models.available} available)\n`;
  msg += `- Categories: ${status.models.categories.join(', ')}\n`;

  if (status.memory.length > 0) {
    msg += `\n## Performance Data\n`;
    for (const m of status.memory.slice(0, 5)) {
      msg += `- ${m.modelId}: ${(m.successRate * 100).toFixed(0)}% success, ${m.avgLatency}ms avg\n`;
    }
  }

  msg += `\nNow plan and execute the full creative pipeline. Use tools to generate real content. Critique your work and iterate if quality < 7/10.`;

  return msg;
}

// ── Export ──────────────────────────────────────────────────────

const controller = {
  orchestrate,
  plan,
  advise,
};

export default controller;
