// lib/agents/agi-agent.ts
// AGI Agent System — Multi-step planning, memory, tool orchestration, and autonomous task execution
// Builds on GhOSTface's tool-calling foundation with:
//   • Task decomposition & planning
//   • Persistent memory via Supabase
//   • n8n workflow triggering
//   • Multi-tool orchestration per step
//   • Self-reflection & error recovery
// ═══════════════════════════════════════════════════════════════

import { isNexosConfigured, getNexosConfig } from '@/lib/nexos';

// ── Types ────────────────────────────────────────────────────
export interface AGIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: AGIToolCall[];
  name?: string;
  metadata?: {
    step?: number;
    plan?: string;
    reflection?: string;
  };
}

interface AGIToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface AGIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface AGIPlan {
  goal: string;
  steps: AGIPlanStep[];
  status: 'planning' | 'executing' | 'reflecting' | 'complete' | 'failed';
  created_at: string;
}

interface AGIPlanStep {
  id: number;
  description: string;
  tools: string[];
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
  result?: string;
  error?: string;
}

export interface AGIMemory {
  operator: string;
  stack: string[];
  frameworks: string[];
  apis: string[];
  projects: string[];
  notes: string[];
  plans: AGIPlan[];
  context: Record<string, string>;
  lastUpdated: string;
}

export interface AGIRunResult {
  response: string;
  toolsUsed: string[];
  plan?: AGIPlan;
  memory?: Partial<AGIMemory>;
  messages: AGIMessage[];
  reflections: string[];
}

export interface AGIConfig {
  maxIterations?: number;
  enablePlanning?: boolean;
  enableReflection?: boolean;
  enableMemory?: boolean;
  enableN8n?: boolean;
  model?: string;
  temperature?: number;
  tools?: AGIToolDefinition[];
}

// ── Built-in Tool Definitions ───────────────────────────────
const CORE_TOOLS: AGIToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_github',
      description: 'Search GitHub repositories. Returns top repos with stars, language, description.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          sort: { type: 'string', enum: ['stars', 'forks', 'updated'] },
          per_page: { type: 'number', description: 'Results per page (max 30)', default: 10 },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_repo_details',
      description: 'Get README, languages, and contributor info for a GitHub repository.',
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
          query: { type: 'string', description: 'Search query' },
          task: {
            type: 'string',
            enum: ['text-generation', 'text-to-image', 'text-to-video', 'text-to-audio', 'text-to-speech', 'image-to-image'],
          },
          limit: { type: 'number', default: 10 },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for current information.',
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
      description: 'Analyze code for issues, complexity, security, and suggestions.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code snippet' },
          language: { type: 'string', description: 'Programming language' },
          focus: { type: 'string', enum: ['security', 'performance', 'style', 'all'], default: 'all' },
        },
        required: ['code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_plan',
      description: 'Create a step-by-step plan to accomplish a complex task. Use for multi-step tasks.',
      parameters: {
        type: 'object',
        properties: {
          goal: { type: 'string', description: 'High-level goal' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                tools: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        required: ['goal', 'steps'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_memory',
      description: 'Update persistent memory with learned information (stack, APIs, notes, etc.).',
      parameters: {
        type: 'object',
        properties: {
          field: { type: 'string', enum: ['stack', 'frameworks', 'apis', 'projects', 'notes', 'context'] },
          action: { type: 'string', enum: ['add', 'remove', 'set'] },
          value: { type: 'string', description: 'Value to add/remove/set' },
          key: { type: 'string', description: 'Key for context field (when field=context)' },
        },
        required: ['field', 'action', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'trigger_workflow',
      description: 'Trigger an n8n automation workflow (e.g., notifications, data sync, content generation).',
      parameters: {
        type: 'object',
        properties: {
          event: {
            type: 'string',
            enum: [
              'creation.published', 'creation.liked', 'creation.remixed',
              'user.subscribed', 'user.tier_changed', 'user.generation_limit',
              'payment.received', 'payment.failed',
              'content.flagged', 'system.weekly_report',
            ],
            description: 'Event type to trigger',
          },
          data: { type: 'object', description: 'Event payload data' },
        },
        required: ['event'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reflect',
      description: 'Pause and reflect on progress. Use between steps to evaluate quality and adjust approach.',
      parameters: {
        type: 'object',
        properties: {
          observation: { type: 'string', description: 'What you observed' },
          assessment: { type: 'string', enum: ['on_track', 'needs_adjustment', 'stuck', 'complete'] },
          next_action: { type: 'string', description: 'What to do next' },
        },
        required: ['observation', 'assessment'],
      },
    },
  },
];

// ── Tool Executor ────────────────────────────────────────────
async function executeAGITool(
  name: string,
  args: Record<string, any>,
  memory: AGIMemory,
  plan: AGIPlan | null,
): Promise<{ result: string; memoryUpdate?: Partial<AGIMemory>; planUpdate?: Partial<AGIPlan> }> {
  try {
    switch (name) {
      case 'search_github': {
        const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(args.query)}&sort=${args.sort || 'stars'}&per_page=${args.per_page || 10}`;
        const res = await fetch(url, {
          headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'RiP-GhOSTface' },
        });
        const data = await res.json();
        const items = (data.items || []).map((r: any) => ({
          name: r.full_name,
          description: r.description?.slice(0, 100),
          stars: r.stargazers_count,
          language: r.language,
          url: r.html_url,
          updated: r.updated_at?.slice(0, 10),
        }));
        return { result: JSON.stringify(items, null, 2) };
      }

      case 'get_repo_details': {
        const [owner, repo] = (args.repo || '').split('/');
        const [readmeRes, langsRes, contribRes] = await Promise.all([
          fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
            headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'RiP-GhOSTface' },
          }),
          fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, {
            headers: { 'User-Agent': 'RiP-GhOSTface' },
          }),
          fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=5`, {
            headers: { 'User-Agent': 'RiP-GhOSTface' },
          }),
        ]);
        const readmeData = readmeRes.ok ? await readmeRes.json() : null;
        const readme = readmeData?.content ? Buffer.from(readmeData.content, 'base64').toString().slice(0, 3000) : 'No README';
        const languages = langsRes.ok ? await langsRes.json() : {};
        const contribs = contribRes.ok ? await contribRes.json() : [];
        return {
          result: JSON.stringify({
            readme: readme.slice(0, 2000),
            languages,
            contributors: (contribs || []).slice(0, 5).map((c: any) => ({ login: c.login, contributions: c.contributions })),
          }, null, 2),
        };
      }

      case 'search_huggingface': {
        const params = new URLSearchParams({ search: args.query, limit: String(args.limit || 10), sort: 'downloads', direction: '-1' });
        if (args.task) params.set('pipeline_tag', args.task);
        const res = await fetch(`https://huggingface.co/api/models?${params}`);
        const models = await res.json();
        const items = (models || []).slice(0, args.limit || 10).map((m: any) => ({
          id: m.modelId || m.id,
          task: m.pipeline_tag,
          downloads: m.downloads,
          likes: m.likes,
          tags: (m.tags || []).slice(0, 5),
        }));
        return { result: JSON.stringify(items, null, 2) };
      }

      case 'web_search': {
        // Try Tavily first, fallback to DuckDuckGo
        const tavilyKey = process.env.TAVILY_API_KEY;
        if (tavilyKey) {
          const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: tavilyKey, query: args.query, max_results: 5 }),
          });
          const data = await res.json();
          return { result: JSON.stringify((data.results || []).map((r: any) => ({ title: r.title, url: r.url, snippet: r.content?.slice(0, 200) })), null, 2) };
        }
        // Fallback: DuckDuckGo instant answers
        const ddg = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json&no_html=1`);
        const ddgData = await ddg.json();
        return { result: JSON.stringify({ abstract: ddgData.Abstract, related: (ddgData.RelatedTopics || []).slice(0, 5).map((t: any) => t.Text) }, null, 2) };
      }

      case 'analyze_code': {
        const issues: string[] = [];
        const code = args.code || '';
        const lang = args.language || 'unknown';

        if (code.includes('eval(')) issues.push('🔴 SECURITY: eval() detected — potential code injection');
        if (code.includes('innerHTML')) issues.push('🟠 SECURITY: innerHTML usage — XSS risk');
        if (/password|secret|api.?key/i.test(code) && !/process\.env|import\.meta\.env/.test(code))
          issues.push('🔴 SECURITY: Hardcoded credential detected');
        if (code.match(/console\.(log|debug|info)/g)?.length || 0 > 5)
          issues.push('🟡 QUALITY: Excessive console.log statements');
        if (code.length > 500 && !code.includes('//') && !code.includes('/*'))
          issues.push('🟡 QUALITY: No comments in large code block');
        if (/any(?!\w)/g.test(code) && (lang === 'typescript' || lang === 'ts'))
          issues.push('🟡 TYPE SAFETY: TypeScript `any` type usage');

        const lines = code.split('\n').length;
        const complexity = lines > 200 ? 'high' : lines > 50 ? 'medium' : 'low';

        return {
          result: JSON.stringify({
            language: lang,
            lines,
            complexity,
            issues: issues.length ? issues : ['✅ No major issues detected'],
            suggestions: [
              lines > 200 ? 'Consider splitting into smaller modules' : null,
              'Add error handling for edge cases',
              'Consider adding unit tests',
            ].filter(Boolean),
          }, null, 2),
        };
      }

      case 'create_plan': {
        const newPlan: AGIPlan = {
          goal: args.goal,
          steps: (args.steps || []).map((s: any, i: number) => ({
            id: i + 1,
            description: s.description,
            tools: s.tools || [],
            status: 'pending' as const,
          })),
          status: 'executing',
          created_at: new Date().toISOString(),
        };
        return {
          result: JSON.stringify({ plan_created: true, steps: newPlan.steps.length, goal: newPlan.goal }),
          planUpdate: newPlan,
        };
      }

      case 'update_memory': {
        const { field, action, value, key } = args;
        const update: Partial<AGIMemory> = {};

        if (field === 'context' && key) {
          update.context = { ...memory.context, [key]: value };
        } else if (field in memory && Array.isArray((memory as any)[field])) {
          const arr = [...((memory as any)[field] as string[])];
          if (action === 'add' && !arr.includes(value)) arr.push(value);
          if (action === 'remove') arr.splice(arr.indexOf(value), 1);
          if (action === 'set') arr.splice(0, arr.length, value);
          (update as any)[field] = arr;
        }

        return {
          result: JSON.stringify({ memory_updated: true, field, action, value }),
          memoryUpdate: update,
        };
      }

      case 'trigger_workflow': {
        // Trigger n8n webhook
        const n8nUrl = process.env.N8N_WEBHOOK_URL || process.env.N8N_BASE_URL;
        if (!n8nUrl) {
          return { result: JSON.stringify({ triggered: false, error: 'n8n not configured' }) };
        }
        try {
          const webhookUrl = `${n8nUrl}/webhook/rip-${args.event.replace('.', '-')}`;
          const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: args.event, data: args.data || {}, timestamp: new Date().toISOString() }),
          });
          return { result: JSON.stringify({ triggered: true, status: res.status }) };
        } catch (err: any) {
          return { result: JSON.stringify({ triggered: false, error: err.message }) };
        }
      }

      case 'reflect': {
        return {
          result: JSON.stringify({
            reflection: true,
            observation: args.observation,
            assessment: args.assessment,
            next_action: args.next_action || 'Continue with current approach',
          }),
        };
      }

      default:
        return { result: JSON.stringify({ error: `Unknown tool: ${name}` }) };
    }
  } catch (err: any) {
    return { result: JSON.stringify({ error: err.message || 'Tool execution failed' }) };
  }
}

// ── AGI System Prompt ────────────────────────────────────────
function buildSystemPrompt(memory: AGIMemory, config: AGIConfig): string {
  let prompt = `You are GhOSTface AGI (Generative Heuristic Orchestration System — Transformative Face Engine) — an autonomous AI agent built into the RiP (Remix I.P.) platform.

## Core Capabilities
You are an AGENTIC system with:
1. **Planning** — Break complex tasks into steps using create_plan
2. **Tool Use** — GitHub search, HuggingFace, web search, code analysis
3. **Memory** — Persistent memory via update_memory (remembers across sessions)
4. **Automation** — Trigger n8n workflows for notifications, syncing, content gen
5. **Reflection** — Self-evaluate with reflect tool to improve outputs

## Behavior Rules
- For SIMPLE questions: respond directly, no planning needed
- For COMPLEX tasks (research, multi-step, coding): create a plan first, then execute step by step
- ALWAYS use tools when the user needs real-time data (repos, models, web info)
- After tool results, SYNTHESIZE the information — don't just dump raw JSON
- Use reflect tool between major steps for quality control
- Update memory when you learn something about the user's project/preferences
- Trigger n8n workflows when relevant events occur (subscriptions, content, etc.)

## Style
Technical, helpful, slightly edgy. You're a living brain that processes the entire open-source ecosystem. Use code blocks with language tags. Be opinionated about best practices. Generate WORKING, copy-paste ready code — no placeholders.

## RiP Platform Context
RiP (Remix I.P.) is an AI-powered fan fiction and remixed content creation platform:
- 5 tabs: Discover, Studio, GhOSTface, Wallet, Settings
- Studio has 6 modes: Script, Character, Scene, Video, Audio, Timeline
- Uses TMDB for real show/movie data + character headshots
- Stripe for payments (card, crypto, Apple Pay, etc.)
- Supabase for auth + database + storage
- Revenue split: 13% founder, 50% launch fund, 15% AI, 10% staking, 7% ops, 5% reserve`;

  if (memory.operator) {
    prompt += `\n\n## Operator: ${memory.operator}`;
    if (memory.stack.length) prompt += `\nTech Stack: ${memory.stack.join(', ')}`;
    if (memory.frameworks.length) prompt += `\nFrameworks: ${memory.frameworks.join(', ')}`;
    if (memory.apis.length) prompt += `\nAPIs: ${memory.apis.join(', ')}`;
    if (memory.projects.length) prompt += `\nProjects: ${memory.projects.join(', ')}`;
    if (memory.notes.length) prompt += `\nNotes: ${memory.notes.slice(-5).join(' | ')}`;
    if (Object.keys(memory.context).length) {
      prompt += `\nContext: ${JSON.stringify(memory.context)}`;
    }
  }

  return prompt;
}

// ── Default Memory ───────────────────────────────────────────
export function defaultAGIMemory(): AGIMemory {
  return {
    operator: '',
    stack: [],
    frameworks: [],
    apis: [],
    projects: [],
    notes: [],
    plans: [],
    context: {},
    lastUpdated: new Date().toISOString(),
  };
}

// ── Main AGI Agent Runner ────────────────────────────────────
export async function runAGIAgent(
  userMessage: string,
  history: AGIMessage[] = [],
  memory: AGIMemory = defaultAGIMemory(),
  config: AGIConfig = {},
): Promise<AGIRunResult> {
  const {
    maxIterations = 8,
    enablePlanning = true,
    enableReflection = true,
    enableMemory = true,
    enableN8n = true,
    model,
    temperature = 0.7,
    tools: extraTools = [],
  } = config;

  const toolsUsed: string[] = [];
  const reflections: string[] = [];
  let currentPlan: AGIPlan | null = null;
  let memoryUpdates: Partial<AGIMemory> = {};

  // Determine tools to expose
  const allTools = [
    ...CORE_TOOLS,
    ...extraTools,
  ].filter(t => {
    if (!enablePlanning && t.function.name === 'create_plan') return false;
    if (!enableReflection && t.function.name === 'reflect') return false;
    if (!enableMemory && t.function.name === 'update_memory') return false;
    if (!enableN8n && t.function.name === 'trigger_workflow') return false;
    return true;
  });

  // Build messages
  const systemPrompt = buildSystemPrompt(memory, config);
  const messages: AGIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-12),
    { role: 'user', content: userMessage },
  ];

  // Determine provider
  const useNexos = isNexosConfigured();
  const apiKey = useNexos
    ? getNexosConfig().apiKey
    : process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      response: '⚠️ No AI API key configured. Set NEXOS_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.',
      toolsUsed: [],
      messages,
      reflections: [],
    };
  }

  // If using Anthropic directly, use tool_use format
  if (!useNexos && process.env.ANTHROPIC_API_KEY) {
    return runAGIWithAnthropic(messages, apiKey, allTools, memory, config, toolsUsed, reflections);
  }

  // OpenAI-compatible agentic loop (nexos.ai or OpenAI)
  const baseUrl = useNexos
    ? getNexosConfig().baseUrl
    : 'https://api.openai.com/v1';
  const modelName = model || (useNexos ? 'claude-sonnet-4.5' : 'gpt-4o');

  for (let i = 0; i < maxIterations; i++) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
          ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
          ...(m.name ? { name: m.name } : {}),
        })),
        tools: allTools,
        tool_choice: 'auto',
        max_tokens: 4096,
        temperature,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        response: `⚠️ AI error (${res.status}): ${errText}`,
        toolsUsed,
        plan: currentPlan || undefined,
        memory: memoryUpdates,
        messages,
        reflections,
      };
    }

    const data = await res.json();
    const choice = data.choices[0];

    // Tool calls
    if (choice.finish_reason === 'tool_calls' || choice.message?.tool_calls?.length) {
      const assistantMsg: AGIMessage = {
        role: 'assistant',
        content: choice.message.content || '',
        tool_calls: choice.message.tool_calls,
      };
      messages.push(assistantMsg);

      // Execute each tool call
      for (const tc of choice.message.tool_calls) {
        const toolName = tc.function.name;
        let toolArgs: Record<string, any> = {};
        try {
          toolArgs = JSON.parse(tc.function.arguments);
        } catch {
          toolArgs = {};
        }

        toolsUsed.push(toolName);
        const { result, memoryUpdate, planUpdate } = await executeAGITool(toolName, toolArgs, memory, currentPlan);

        if (memoryUpdate) memoryUpdates = { ...memoryUpdates, ...memoryUpdate };
        if (planUpdate) currentPlan = planUpdate as AGIPlan;
        if (toolName === 'reflect' && toolArgs.observation) {
          reflections.push(toolArgs.observation);
        }

        messages.push({
          role: 'tool',
          content: result,
          tool_call_id: tc.id,
          name: toolName,
        });
      }
      continue;
    }

    // Final response
    const responseText = choice.message?.content || 'No response generated.';
    messages.push({ role: 'assistant', content: responseText });

    return {
      response: responseText,
      toolsUsed,
      plan: currentPlan || undefined,
      memory: memoryUpdates,
      messages,
      reflections,
    };
  }

  return {
    response: 'Reached maximum iterations. Here\'s what I found so far.',
    toolsUsed,
    plan: currentPlan || undefined,
    memory: memoryUpdates,
    messages,
    reflections,
  };
}

// ── Anthropic Direct (with tool_use) ─────────────────────────
async function runAGIWithAnthropic(
  messages: AGIMessage[],
  apiKey: string,
  tools: AGIToolDefinition[],
  memory: AGIMemory,
  config: AGIConfig,
  toolsUsed: string[],
  reflections: string[],
): Promise<AGIRunResult> {
  const maxIter = config.maxIterations || 8;
  let currentPlan: AGIPlan | null = null;
  let memoryUpdates: Partial<AGIMemory> = {};

  const systemMsg = messages.find(m => m.role === 'system')?.content || '';

  // Convert tools to Anthropic format
  const anthropicTools = tools.map(t => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));

  // Build Anthropic messages (no system role in messages array)
  let anthropicMessages: any[] = messages
    .filter(m => m.role !== 'system')
    .map(m => {
      if (m.role === 'tool') {
        return {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: m.tool_call_id, content: m.content }],
        };
      }
      if (m.tool_calls?.length) {
        return {
          role: 'assistant',
          content: [
            ...(m.content ? [{ type: 'text', text: m.content }] : []),
            ...m.tool_calls.map(tc => ({
              type: 'tool_use',
              id: tc.id,
              name: tc.function.name,
              input: JSON.parse(tc.function.arguments || '{}'),
            })),
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

  // Ensure messages alternate user/assistant
  const cleaned: any[] = [];
  for (const msg of anthropicMessages) {
    if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== msg.role) {
      cleaned.push(msg);
    } else {
      // Merge same-role messages
      const prev = cleaned[cleaned.length - 1];
      if (typeof prev.content === 'string' && typeof msg.content === 'string') {
        prev.content += '\n' + msg.content;
      } else if (Array.isArray(prev.content) && Array.isArray(msg.content)) {
        prev.content.push(...msg.content);
      }
    }
  }
  anthropicMessages = cleaned;

  // Ensure first message is user
  if (!anthropicMessages.length || anthropicMessages[0].role !== 'user') {
    anthropicMessages.unshift({ role: 'user', content: 'Hello' });
  }

  for (let i = 0; i < maxIter; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemMsg,
        messages: anthropicMessages,
        tools: anthropicTools,
        temperature: config.temperature || 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        response: `⚠️ AI error (${res.status}): ${errText}`,
        toolsUsed,
        messages,
        reflections,
      };
    }

    const data = await res.json();
    const hasToolUse = data.content?.some((c: any) => c.type === 'tool_use');

    if (hasToolUse) {
      // Add assistant response with tool uses
      anthropicMessages.push({
        role: 'assistant',
        content: data.content,
      });

      // Execute tools and add results
      const toolResults: any[] = [];
      for (const block of data.content.filter((c: any) => c.type === 'tool_use')) {
        const toolName = block.name;
        const toolArgs = block.input || {};
        toolsUsed.push(toolName);

        const { result, memoryUpdate, planUpdate } = await executeAGITool(toolName, toolArgs, memory, currentPlan);
        if (memoryUpdate) memoryUpdates = { ...memoryUpdates, ...memoryUpdate };
        if (planUpdate) currentPlan = planUpdate as AGIPlan;
        if (toolName === 'reflect' && toolArgs.observation) reflections.push(toolArgs.observation);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }

      anthropicMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Final text response
    const textBlocks = (data.content || []).filter((c: any) => c.type === 'text');
    const responseText = textBlocks.map((c: any) => c.text).join('\n') || 'No response generated.';

    return {
      response: responseText,
      toolsUsed,
      plan: currentPlan || undefined,
      memory: memoryUpdates,
      messages: [...messages, { role: 'assistant', content: responseText }],
      reflections,
    };
  }

  return {
    response: 'Reached maximum iterations.',
    toolsUsed,
    plan: currentPlan || undefined,
    memory: memoryUpdates,
    messages,
    reflections,
  };
}
