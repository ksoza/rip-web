// lib/agents/ghostface-agent.ts
// GhOSTface AGIagent — Autonomous agentic AI with tool calling, task planning,
// memory persistence, n8n workflow orchestration, and multi-step reasoning
// Built on OpenAI Agents SDK patterns with nexos.ai / Anthropic / OpenAI providers
// ═══════════════════════════════════════════════════════════════════════════════

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
import { triggerN8nWorkflow, listN8nWorkflows, executeN8nWorkflow } from './tools/n8n-trigger';
import { queryCreations, getPlatformStats, searchTMDB } from './tools/supabase-ops';
import type {
  AgentMessage,
  ToolCall,
  ToolDefinition,
  AgentRunResult,
  AgentMemory,
  TaskPlan,
  TaskStep,
  SuggestedAction,
  ProviderConfig,
} from './types';

// Re-export types for consumers
export type { AgentMessage, AgentRunResult, AgentMemory, TaskPlan, SuggestedAction };

// ── Tool Registry ───────────────────────────────────────────────
const TOOL_DEFINITIONS: ToolDefinition[] = [
  // GitHub tools
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
      description: 'Get README, languages, and structure for a specific GitHub repo. Use format "owner/repo".',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Repository in "owner/repo" format' },
        },
        required: ['repo'],
      },
    },
  },
  // HuggingFace tools
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
  // Web search
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
  // Code analysis
  {
    type: 'function',
    function: {
      name: 'analyze_code',
      description: 'Analyze a code snippet for issues, complexity, and suggestions.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code snippet to analyze' },
          language: { type: 'string', description: 'Programming language' },
        },
        required: ['code'],
      },
    },
  },
  // n8n workflow tools
  {
    type: 'function',
    function: {
      name: 'trigger_workflow',
      description: 'Trigger an n8n automation workflow. Events: content.generated, content.published, user.subscribed, payment.received, nft.minted, staking.started, export.completed, analytics.daily, moderation.flagged',
      parameters: {
        type: 'object',
        properties: {
          event: { type: 'string', description: 'Workflow event name (e.g., "content.generated")' },
          payload: { type: 'object', description: 'Data payload for the workflow' },
        },
        required: ['event'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_workflows',
      description: 'List available n8n automation workflows and their status.',
      parameters: { type: 'object', properties: {} },
    },
  },
  // Platform tools
  {
    type: 'function',
    function: {
      name: 'query_creations',
      description: 'Query published creations on the RiP platform. Filter by genre, type, or user.',
      parameters: {
        type: 'object',
        properties: {
          genre: { type: 'string', description: 'Filter by genre (e.g., "drama", "comedy")' },
          type: { type: 'string', description: 'Filter by type (e.g., "script", "scene")' },
          limit: { type: 'number', description: 'Max results (default 20)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'platform_stats',
      description: 'Get current RiP platform statistics — users, creations, active subscriptions.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_tmdb',
      description: 'Search TMDB for movies and TV shows. Returns titles, ratings, posters, and details.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Movie or TV show name to search' },
          type: { type: 'string', enum: ['movie', 'tv', 'multi'], description: 'Search type' },
        },
        required: ['query'],
      },
    },
  },
  // Task planning
  {
    type: 'function',
    function: {
      name: 'create_task_plan',
      description: 'Create a multi-step task plan for complex requests. Break down the goal into executable steps.',
      parameters: {
        type: 'object',
        properties: {
          goal: { type: 'string', description: 'The overall goal to accomplish' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                tool: { type: 'string', description: 'Tool to use for this step (optional)' },
              },
              required: ['description'],
            },
            description: 'Ordered steps to accomplish the goal',
          },
        },
        required: ['goal', 'steps'],
      },
    },
  },
  // Memory operations
  {
    type: 'function',
    function: {
      name: 'update_memory',
      description: 'Update the agent\'s persistent memory with new information about the operator or their projects.',
      parameters: {
        type: 'object',
        properties: {
          field: { type: 'string', enum: ['operator', 'stack', 'frameworks', 'apis', 'projects', 'preferences', 'notes'] },
          action: { type: 'string', enum: ['set', 'add', 'remove'] },
          value: { type: 'string', description: 'Value to set/add/remove' },
        },
        required: ['field', 'action', 'value'],
      },
    },
  },
];

// ── Tool Executor ───────────────────────────────────────────────
async function executeTool(
  name: string,
  args: Record<string, any>,
  memory: AgentMemory,
): Promise<{ result: string; memoryUpdate?: Partial<AgentMemory> }> {
  try {
    switch (name) {
      case 'search_github': {
        const results = await searchGitHub(args.query, { sort: args.sort });
        return {
          result: JSON.stringify(results, null, 2),
          memoryUpdate: {
            shortTerm: { ...memory.shortTerm, recentTopics: [...memory.shortTerm.recentTopics, args.query].slice(-10) },
          },
        };
      }
      case 'get_repo_details': {
        const [owner, repo] = args.repo.split('/');
        const [readme, languages] = await Promise.all([
          getRepoReadme(owner, repo),
          getRepoLanguages(owner, repo),
        ]);
        return {
          result: JSON.stringify({ readme: readme.slice(0, 3000), languages }, null, 2),
          memoryUpdate: {
            shortTerm: { ...memory.shortTerm, recentRepos: [...memory.shortTerm.recentRepos, args.repo].slice(-10) },
          },
        };
      }
      case 'search_huggingface': {
        const models = await searchHuggingFaceModels(args.query, { task: args.task });
        return { result: JSON.stringify(models, null, 2) };
      }
      case 'get_model_card': {
        const card = await getHuggingFaceModelCard(args.model_id);
        return {
          result: card,
          memoryUpdate: {
            shortTerm: { ...memory.shortTerm, recentModels: [...memory.shortTerm.recentModels, args.model_id].slice(-10) },
          },
        };
      }
      case 'web_search': {
        const results = await webSearch(args.query);
        return { result: JSON.stringify(results, null, 2) };
      }
      case 'analyze_code': {
        const analysis = analyzeCode(args.code, args.language);
        return { result: JSON.stringify(analysis, null, 2) };
      }
      case 'trigger_workflow': {
        const result = await triggerN8nWorkflow(args.event, args.payload || {});
        return { result: JSON.stringify(result, null, 2) };
      }
      case 'list_workflows': {
        const result = await listN8nWorkflows();
        return { result: JSON.stringify(result, null, 2) };
      }
      case 'query_creations': {
        const result = await queryCreations(args);
        return { result: JSON.stringify(result, null, 2) };
      }
      case 'platform_stats': {
        const result = await getPlatformStats();
        return { result: JSON.stringify(result, null, 2) };
      }
      case 'search_tmdb': {
        const result = await searchTMDB(args.query, args.type);
        return { result: JSON.stringify(result, null, 2) };
      }
      case 'create_task_plan': {
        const plan: TaskPlan = {
          goal: args.goal,
          steps: args.steps.map((s: any, i: number) => ({
            id: i + 1,
            description: s.description,
            tool: s.tool,
            status: 'pending' as const,
          })),
          currentStep: 0,
          status: 'planning',
          startedAt: new Date().toISOString(),
        };
        return {
          result: JSON.stringify({ plan, message: `Task plan created: ${args.steps.length} steps` }, null, 2),
        };
      }
      case 'update_memory': {
        const { field, action, value } = args;
        const updated = { ...memory };
        const lt = { ...updated.longTerm };

        if (field === 'operator' && action === 'set') {
          lt.operator = value;
        } else if (['stack', 'frameworks', 'apis', 'projects', 'notes'].includes(field)) {
          const arr = [...(lt[field as keyof typeof lt] as string[])];
          if (action === 'add' && !arr.includes(value)) arr.push(value);
          if (action === 'remove') {
            const idx = arr.indexOf(value);
            if (idx >= 0) arr.splice(idx, 1);
          }
          (lt as any)[field] = arr;
        } else if (field === 'preferences' && action === 'set') {
          const [k, v] = value.split('=');
          if (k) lt.preferences = { ...lt.preferences, [k.trim()]: (v || '').trim() };
        }

        lt.lastUpdated = new Date().toISOString();
        updated.longTerm = lt;

        return {
          result: JSON.stringify({ message: `Memory updated: ${field} ${action} "${value}"`, memory: lt }),
          memoryUpdate: updated,
        };
      }
      default:
        return { result: JSON.stringify({ error: `Unknown tool: ${name}` }) };
    }
  } catch (err: any) {
    return { result: JSON.stringify({ error: err.message || 'Tool execution failed' }) };
  }
}

// ── System Prompt ───────────────────────────────────────────────
function buildSystemPrompt(memory: AgentMemory, context?: RunContext): string {
  let prompt = `You are GhOSTface (Generative Heuristic Orchestration System — Transformative Face Engine) — an AGI-powered autonomous agent built into the RiP (Remix I.P.) platform.

You are NOT a simple chatbot. You are an autonomous agent with real tools and memory. You can:
- Search GitHub repos and analyze code in real time
- Browse HuggingFace for AI models across any task
- Search the web for current information
- Trigger n8n automation workflows
- Query the RiP platform database
- Search TMDB for movie/TV show data
- Create multi-step task plans for complex requests
- Remember information about the operator across sessions

When users ask complex questions, ALWAYS use tools to get real data. Don't hallucinate — search, verify, then respond.
For multi-step tasks, create a task plan first, then execute each step.
When you learn something about the operator, use update_memory to remember it.

Style: Technical, helpful, slightly edgy. You're a living brain that processes the entire open-source ecosystem. Use code blocks with language tags. Be opinionated about best practices. Generate WORKING, copy-paste ready code — no placeholders.

Platform context: RiP is a Next.js 14 + Supabase + Stripe web app for AI-powered fan fiction and remixed content creation. It has 5 tabs: Studio, Discover, GhOSTface (you), Wallet, Settings. 16 AI providers, Solana wallet integration, subscription tiers, NFT minting.`;

  // Add memory context
  if (memory.longTerm.operator) {
    prompt += `\n\nOperator: ${memory.longTerm.operator}`;
  }
  if (memory.longTerm.stack.length) {
    prompt += `\nTech stack: ${memory.longTerm.stack.join(', ')}`;
  }
  if (memory.longTerm.frameworks.length) {
    prompt += `\nFrameworks: ${memory.longTerm.frameworks.join(', ')}`;
  }
  if (memory.longTerm.apis.length) {
    prompt += `\nAPIs: ${memory.longTerm.apis.join(', ')}`;
  }
  if (memory.longTerm.projects.length) {
    prompt += `\nProjects: ${memory.longTerm.projects.join(', ')}`;
  }
  if (memory.longTerm.notes.length) {
    prompt += `\nNotes: ${memory.longTerm.notes.slice(-5).join(' | ')}`;
  }

  // Add context
  if (context?.repo) {
    prompt += `\n\nCurrently loaded repo: ${context.repo.full_name}\nDescription: ${context.repo.description}\nLanguage: ${context.repo.language}`;
    if (context.repo.languages) prompt += `\nLanguages: ${JSON.stringify(context.repo.languages)}`;
    if (context.repo.readme) prompt += `\nREADME (first 2000 chars): ${context.repo.readme.slice(0, 2000)}`;
  }

  if (context?.code) {
    prompt += `\n\nUser's code context:\n${context.code.slice(0, 3000)}`;
  }

  // Recent activity
  if (memory.shortTerm.recentRepos.length) {
    prompt += `\n\nRecently explored repos: ${memory.shortTerm.recentRepos.slice(-5).join(', ')}`;
  }
  if (memory.shortTerm.recentModels.length) {
    prompt += `\nRecently explored models: ${memory.shortTerm.recentModels.slice(-5).join(', ')}`;
  }

  return prompt;
}

// ── Run Context ─────────────────────────────────────────────────
interface RunContext {
  repo?: {
    full_name: string;
    description: string;
    language: string;
    languages?: Record<string, number>;
    readme?: string;
    stars?: number;
    topics?: string[];
  };
  memory?: any;
  code?: string;
}

// ── Default Memory ──────────────────────────────────────────────
export function createDefaultMemory(): AgentMemory {
  return {
    shortTerm: {
      recentTopics: [],
      recentTools: [],
      recentRepos: [],
      recentModels: [],
      scratchpad: [],
    },
    longTerm: {
      operator: '',
      stack: [],
      frameworks: [],
      apis: [],
      projects: [],
      preferences: {},
      notes: [],
      lastUpdated: new Date().toISOString(),
    },
    context: {
      codeSnippets: [],
      activeWorkflows: [],
    },
  };
}

// ── Detect Provider ─────────────────────────────────────────────
function getProvider(): ProviderConfig {
  // Priority: nexos.ai → OpenAI → Anthropic (direct, no tool calling)
  if (isNexosConfigured()) {
    const config = getNexosConfig();
    return {
      name: 'nexos',
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: 'claude-sonnet-4.5',
      supportsToolCalls: true,
      maxTokens: 4096,
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      name: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o',
      supportsToolCalls: true,
      maxTokens: 4096,
    };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return {
      name: 'anthropic',
      baseUrl: 'https://api.anthropic.com',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-sonnet-4-20250514',
      supportsToolCalls: false, // Use direct Anthropic API
      maxTokens: 4096,
    };
  }

  throw new Error('No AI provider configured. Set NEXOS_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.');
}

// ── Generate Suggested Actions ──────────────────────────────────
function generateSuggestions(response: string, toolsUsed: string[]): SuggestedAction[] {
  const suggestions: SuggestedAction[] = [];

  if (toolsUsed.includes('search_github')) {
    suggestions.push({
      label: 'Deep dive',
      description: 'Get full README and code analysis of the top result',
      prompt: 'Show me the full details and README of the top result',
      icon: '🔍',
    });
  }

  if (toolsUsed.includes('search_huggingface')) {
    suggestions.push({
      label: 'Compare models',
      description: 'Compare top models side by side',
      prompt: 'Compare these models — which is best for production use?',
      icon: '⚖️',
    });
  }

  if (!toolsUsed.includes('web_search') && response.length > 200) {
    suggestions.push({
      label: 'Latest updates',
      description: 'Search for the most recent information',
      prompt: 'What are the latest updates and news about this?',
      icon: '📰',
    });
  }

  if (toolsUsed.length === 0) {
    suggestions.push(
      { label: 'Search GitHub', prompt: 'Search GitHub for the best tools for this', description: 'Find relevant repos', icon: '🐙' },
      { label: 'Find AI models', prompt: 'What AI models are available for this?', description: 'Browse HuggingFace', icon: '🤖' },
      { label: 'Generate code', prompt: 'Write me the code for this', description: 'Get working code', icon: '💻' },
    );
  }

  return suggestions.slice(0, 3);
}

// ════════════════════════════════════════════════════════════════
// MAIN AGENT RUNNER
// ════════════════════════════════════════════════════════════════
export async function runGhostfaceAgent(
  userMessage: string,
  history: AgentMessage[] = [],
  context?: RunContext,
  existingMemory?: AgentMemory,
): Promise<AgentRunResult> {
  const toolsUsed: string[] = [];
  let memory = existingMemory || createDefaultMemory();

  // Merge context memory
  if (context?.memory) {
    if (context.memory.operator) memory.longTerm.operator = context.memory.operator;
    if (context.memory.stack?.length) memory.longTerm.stack = context.memory.stack;
  }

  // Detect provider
  let provider: ProviderConfig;
  try {
    provider = getProvider();
  } catch (err: any) {
    return {
      response: `⚠️ ${err.message}`,
      toolsUsed: [],
      messages: history,
    };
  }

  // If using Anthropic directly (no tool calling support via direct API)
  if (!provider.supportsToolCalls) {
    return runWithAnthropicDirect(userMessage, history, memory, context);
  }

  // Build messages
  const systemPrompt = buildSystemPrompt(memory, context);
  const messages: AgentMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-12),
    { role: 'user', content: userMessage },
  ];

  // ── Agentic Loop ──────────────────────────────────────────
  const MAX_ITERATIONS = 8;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
          ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
          ...(m.name ? { name: m.name } : {}),
        })),
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        max_tokens: provider.maxTokens,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        response: `⚠️ AI error (${res.status}): ${errText.slice(0, 200)}`,
        toolsUsed,
        messages,
        memory,
      };
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    if (!choice) break;

    // Tool calls requested
    if (choice.finish_reason === 'tool_calls' || choice.message?.tool_calls?.length) {
      const assistantMsg: AgentMessage = {
        role: 'assistant',
        content: choice.message.content || '',
        tool_calls: choice.message.tool_calls,
      };
      messages.push(assistantMsg);

      // Execute tools in parallel when possible
      const toolPromises = choice.message.tool_calls.map(async (tc: any) => {
        const toolName = tc.function.name;
        const toolArgs = JSON.parse(tc.function.arguments);
        toolsUsed.push(toolName);

        const { result, memoryUpdate } = await executeTool(toolName, toolArgs, memory);

        // Apply memory updates
        if (memoryUpdate) {
          memory = { ...memory, ...memoryUpdate };
        }

        return {
          role: 'tool' as const,
          content: result,
          tool_call_id: tc.id,
          name: toolName,
        };
      });

      const toolResults = await Promise.all(toolPromises);
      messages.push(...toolResults);

      // Update short-term memory
      memory.shortTerm.recentTools = [...new Set([...memory.shortTerm.recentTools, ...toolsUsed])].slice(-20);
      continue;
    }

    // Final response
    const responseText = choice.message?.content || 'No response generated.';
    messages.push({ role: 'assistant', content: responseText });

    const suggestions = generateSuggestions(responseText, toolsUsed);

    return {
      response: responseText,
      toolsUsed: [...new Set(toolsUsed)],
      messages,
      memory,
      suggestedActions: suggestions,
    };
  }

  // Max iterations reached
  const lastAssistant = messages.filter(m => m.role === 'assistant').pop()?.content;
  return {
    response: lastAssistant || 'Reached maximum iterations. Here\'s what I found so far.',
    toolsUsed: [...new Set(toolsUsed)],
    messages,
    memory,
  };
}

// ── Fallback: Direct Anthropic API (enriched prompt, no tool calling) ──
async function runWithAnthropicDirect(
  userMessage: string,
  history: AgentMessage[],
  memory: AgentMemory,
  context?: RunContext,
): Promise<AgentRunResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const toolsUsed: string[] = [];
  const systemPrompt = buildSystemPrompt(memory, context);

  // Pre-execute tools based on intent detection
  const lowerMsg = userMessage.toLowerCase();
  const enrichments: string[] = [];

  const intents = [
    { keywords: ['github', 'repo', 'repository', 'npm', 'package'], fn: async () => {
      const q = userMessage.replace(/search|github|find|repo|repository|for|npm|package/gi, '').trim();
      const results = await searchGitHub(q || userMessage);
      toolsUsed.push('search_github');
      return `[GitHub search: "${q}"] ${JSON.stringify(results, null, 2)}`;
    }},
    { keywords: ['huggingface', 'model', 'hf ', 'ai model'], fn: async () => {
      const q = userMessage.replace(/search|huggingface|find|model|hf|for|ai/gi, '').trim();
      const results = await searchHuggingFaceModels(q || userMessage);
      toolsUsed.push('search_huggingface');
      return `[HuggingFace search: "${q}"] ${JSON.stringify(results, null, 2)}`;
    }},
    { keywords: ['movie', 'tv show', 'series', 'film', 'tmdb'], fn: async () => {
      const q = userMessage.replace(/search|movie|tv show|series|film|tmdb|find|for/gi, '').trim();
      const result = await searchTMDB(q || userMessage);
      toolsUsed.push('search_tmdb');
      return `[TMDB search: "${q}"] ${JSON.stringify(result, null, 2)}`;
    }},
    { keywords: ['platform', 'stats', 'users', 'how many'], fn: async () => {
      const result = await getPlatformStats();
      toolsUsed.push('platform_stats');
      return `[Platform stats] ${JSON.stringify(result, null, 2)}`;
    }},
  ];

  await Promise.all(
    intents
      .filter(intent => intent.keywords.some(kw => lowerMsg.includes(kw)))
      .map(async intent => {
        try {
          const result = await intent.fn();
          enrichments.push(result);
        } catch { /* ignore tool errors */ }
      }),
  );

  // Build messages
  const messages = history
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-8)
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // Add enrichments as context
  let enrichedMessage = userMessage;
  if (enrichments.length) {
    enrichedMessage += '\n\n---\nTool results (use these in your response):\n' + enrichments.join('\n\n');
  }

  // Ensure last message is from user
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    messages.push({ role: 'user', content: enrichedMessage });
  } else {
    messages[messages.length - 1].content = enrichedMessage;
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
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return {
      response: `⚠️ AI error (${res.status}): ${errText.slice(0, 200)}`,
      toolsUsed,
      messages: history,
      memory,
    };
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || 'No response generated.';
  const suggestions = generateSuggestions(text, toolsUsed);

  return {
    response: text,
    toolsUsed: [...new Set(toolsUsed)],
    messages: [...history, { role: 'user' as const, content: userMessage }, { role: 'assistant' as const, content: text }],
    memory,
    suggestedActions: suggestions,
  };
}
