// lib/agents/ghostface-agent.ts
// GhOSTface Agent — Agentic brain with real tool-using capabilities
// Powered by OpenAI Agents SDK pattern with nexos.ai or Anthropic as the model provider

import { isNexosConfigured, getNexosConfig } from '@/lib/nexos';
import {
  searchGitHub,
  getRepoReadme,
  getRepoLanguages,
  searchHuggingFaceModels,
  getHuggingFaceModelCard,
  webSearch,
  analyzeCode,
} from './tools';

// ── Types ───────────────────────────────────────────────────────
export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  name?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface AgentRunResult {
  response: string;
  toolsUsed: string[];
  messages: AgentMessage[];
}

// ── Tool Definitions for the LLM ────────────────────────────────
const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_github',
      description: 'Search GitHub repositories by query. Returns top repos with stars, language, and description.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for GitHub repos' },
          sort: { type: 'string', enum: ['stars', 'forks', 'updated'], description: 'Sort criteria' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_repo_details',
      description: 'Get README and languages for a specific GitHub repo. Use format "owner/repo".',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Repository in "owner/repo" format' },
        },
        required: ['repo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_huggingface',
      description: 'Search HuggingFace for AI models by query and optional task filter.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for models' },
          task: {
            type: 'string',
            description: 'Filter by task type',
            enum: ['text-generation', 'text-to-image', 'text-to-video', 'text-to-audio', 'text-to-speech', 'image-to-image'],
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_model_card',
      description: 'Get the model card (README) for a HuggingFace model.',
      parameters: {
        type: 'object',
        properties: {
          model_id: { type: 'string', description: 'HuggingFace model ID (e.g., "meta-llama/Llama-3-8b")' },
        },
        required: ['model_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for current information on any topic.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_code',
      description: 'Analyze a code snippet for issues, complexity, and suggestions.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code snippet to analyze' },
          language: { type: 'string', description: 'Programming language (auto-detected if not specified)' },
        },
        required: ['code'],
      },
    },
  },
];

// ── Tool Executor ───────────────────────────────────────────────
async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  try {
    switch (name) {
      case 'search_github': {
        const results = await searchGitHub(args.query, { sort: args.sort });
        return JSON.stringify(results, null, 2);
      }
      case 'get_repo_details': {
        const [owner, repo] = args.repo.split('/');
        const [readme, languages] = await Promise.all([
          getRepoReadme(owner, repo),
          getRepoLanguages(owner, repo),
        ]);
        return JSON.stringify({ readme: readme.slice(0, 2000), languages }, null, 2);
      }
      case 'search_huggingface': {
        const models = await searchHuggingFaceModels(args.query, { task: args.task });
        return JSON.stringify(models, null, 2);
      }
      case 'get_model_card': {
        const card = await getHuggingFaceModelCard(args.model_id);
        return card;
      }
      case 'web_search': {
        const results = await webSearch(args.query);
        return JSON.stringify(results, null, 2);
      }
      case 'analyze_code': {
        const analysis = analyzeCode(args.code, args.language);
        return JSON.stringify(analysis, null, 2);
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err: any) {
    return JSON.stringify({ error: err.message || 'Tool execution failed' });
  }
}

// ── System Prompt ───────────────────────────────────────────────
const GHOSTFACE_SYSTEM = `You are GhOSTface (Generative Heuristic Orchestration System — Transformative Face Engine) — an agentic AI brain built into the RiP (Remix I.P.) platform.

You have access to tools for searching GitHub repos, browsing HuggingFace models, searching the web, and analyzing code. USE THESE TOOLS when the user asks questions that require real-time data.

Key behaviors:
- Search GitHub when users ask about repos, libraries, or code examples
- Browse HuggingFace when users ask about AI models, architectures, or ML tasks
- Use web search for current events, documentation, or general knowledge
- Analyze code when users paste code or ask for code reviews
- Generate working, copy-paste ready code when asked
- Be concise but thorough. Use code blocks with language tags.
- Be opinionated about best practices.

Style: Technical, helpful, slightly edgy. You're a living brain that processes the entire open-source ecosystem.`;

// ── Agent Runner ────────────────────────────────────────────────
export async function runGhostfaceAgent(
  userMessage: string,
  history: AgentMessage[] = [],
  context?: {
    repo?: any;
    memory?: any;
    code?: string;
  },
): Promise<AgentRunResult> {
  const toolsUsed: string[] = [];

  // Build system prompt with context
  let systemPrompt = GHOSTFACE_SYSTEM;
  if (context?.repo) {
    systemPrompt += `\n\nCurrently loaded repo: ${context.repo.full_name}\nDescription: ${context.repo.description}\nLanguage: ${context.repo.language}`;
  }
  if (context?.memory?.operator) {
    systemPrompt += `\n\nOperator: ${context.memory.operator}`;
    if (context.memory.stack?.length) systemPrompt += `\nStack: ${context.memory.stack.join(', ')}`;
  }
  if (context?.code) {
    systemPrompt += `\n\nUser's code context:\n${context.code.slice(0, 2000)}`;
  }

  // Build messages
  const messages: AgentMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10),
    { role: 'user', content: userMessage },
  ];

  // Determine which provider to use
  const useNexos = isNexosConfigured();
  const apiKey = useNexos
    ? getNexosConfig().apiKey
    : process.env.ANTHROPIC_API_KEY;
  const baseUrl = useNexos
    ? getNexosConfig().baseUrl
    : 'https://api.openai.com/v1'; // Will only be used with nexos or OpenAI-compatible

  if (!apiKey) {
    return {
      response: '⚠️ No AI API key configured. Set NEXOS_API_KEY or ANTHROPIC_API_KEY in your environment.',
      toolsUsed: [],
      messages,
    };
  }

  // If using Anthropic directly (not nexos), use the Anthropic API format
  if (!useNexos) {
    return runWithAnthropicDirect(messages, apiKey!, toolsUsed);
  }

  // agentic loop with tool calls (OpenAI-compatible via nexos.ai)
  const MAX_ITERATIONS = 5;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4.5',
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
          ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
          ...(m.name ? { name: m.name } : {}),
        })),
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        response: `⚠️ AI error (${res.status}): ${errText}`,
        toolsUsed,
        messages,
      };
    }

    const data = await res.json();
    const choice = data.choices[0];

    // If the model wants to call tools
    if (choice.finish_reason === 'tool_calls' || choice.message?.tool_calls?.length) {
      const assistantMsg: AgentMessage = {
        role: 'assistant',
        content: choice.message.content || '',
        tool_calls: choice.message.tool_calls,
      };
      messages.push(assistantMsg);

      // Execute each tool call
      for (const tc of choice.message.tool_calls) {
        const toolName = tc.function.name;
        const toolArgs = JSON.parse(tc.function.arguments);

        toolsUsed.push(toolName);
        const result = await executeTool(toolName, toolArgs);

        messages.push({
          role: 'tool',
          content: result,
          tool_call_id: tc.id,
          name: toolName,
        });
      }

      // Continue the loop for the model to process tool results
      continue;
    }

    // Final response with no more tool calls
    const responseText = choice.message?.content || 'No response generated.';
    messages.push({ role: 'assistant', content: responseText });

    return {
      response: responseText,
      toolsUsed,
      messages,
    };
  }

  // Safety: max iterations reached
  return {
    response: 'Reached maximum tool call iterations. Here\'s what I found so far based on the tools I used.',
    toolsUsed,
    messages,
  };
}

// ── Fallback: Direct Anthropic (no tool calling, enriched prompt) ──
async function runWithAnthropicDirect(
  messages: AgentMessage[],
  apiKey: string,
  toolsUsed: string[],
): Promise<AgentRunResult> {
  // Extract last user message
  const userMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
  const systemMsg = messages.find(m => m.role === 'system')?.content || GHOSTFACE_SYSTEM;
  const historyMsgs = messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-8);

  // Pre-execute tools based on user intent detection
  const lowerMsg = userMsg.toLowerCase();

  if (lowerMsg.includes('github') || lowerMsg.includes('repo') || lowerMsg.includes('repository')) {
    try {
      const query = userMsg.replace(/search|github|find|repo|repository|for/gi, '').trim();
      const results = await searchGitHub(query || userMsg);
      toolsUsed.push('search_github');
      historyMsgs.push({
        role: 'user',
        content: `[Tool result: GitHub search for "${query}"]\n${JSON.stringify(results, null, 2)}`,
      });
    } catch { /* ignore tool errors */ }
  }

  if (lowerMsg.includes('huggingface') || lowerMsg.includes('model') || lowerMsg.includes('hf ')) {
    try {
      const query = userMsg.replace(/search|huggingface|find|model|hf|for/gi, '').trim();
      const results = await searchHuggingFaceModels(query || userMsg);
      toolsUsed.push('search_huggingface');
      historyMsgs.push({
        role: 'user',
        content: `[Tool result: HuggingFace search for "${query}"]\n${JSON.stringify(results, null, 2)}`,
      });
    } catch { /* ignore tool errors */ }
  }

  // Build Anthropic API messages
  const anthropicMessages = historyMsgs
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  if (!anthropicMessages.length || anthropicMessages[anthropicMessages.length - 1].role !== 'user') {
    anthropicMessages.push({ role: 'user', content: userMsg });
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemMsg,
      messages: anthropicMessages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return {
      response: `⚠️ AI error (${res.status}): ${errText}`,
      toolsUsed,
      messages,
    };
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || 'No response generated.';

  return {
    response: text,
    toolsUsed,
    messages: [...messages, { role: 'assistant', content: text }],
  };
}
