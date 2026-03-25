// lib/agents/types.ts
// AGIagent Type System — Shared types for the GhOSTface agent framework

// ── Message Types ───────────────────────────────────────────────
export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  name?: string;
  metadata?: Record<string, any>;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

// ── Agent State ─────────────────────────────────────────────────
export interface AgentState {
  id: string;
  userId?: string;
  messages: AgentMessage[];
  memory: AgentMemory;
  activeTools: string[];
  taskPlan?: TaskPlan;
  status: 'idle' | 'thinking' | 'tool_calling' | 'responding' | 'error';
  iterations: number;
  maxIterations: number;
}

// ── Memory ──────────────────────────────────────────────────────
export interface AgentMemory {
  shortTerm: ShortTermMemory;
  longTerm: LongTermMemory;
  context: ContextMemory;
}

export interface ShortTermMemory {
  recentTopics: string[];
  recentTools: string[];
  recentRepos: string[];
  recentModels: string[];
  currentTask?: string;
  scratchpad: string[];
}

export interface LongTermMemory {
  operator: string;
  stack: string[];
  frameworks: string[];
  apis: string[];
  projects: string[];
  preferences: Record<string, string>;
  notes: string[];
  lastUpdated: string;
}

export interface ContextMemory {
  loadedRepo?: RepoContext;
  loadedModel?: ModelContext;
  codeSnippets: { language: string; code: string; description: string }[];
  activeWorkflows: string[];
}

export interface RepoContext {
  fullName: string;
  description: string;
  language: string;
  languages: Record<string, number>;
  readme: string;
  stars: number;
  topics: string[];
}

export interface ModelContext {
  id: string;
  task: string;
  description: string;
  downloads: number;
}

// ── Task Planning ───────────────────────────────────────────────
export interface TaskPlan {
  goal: string;
  steps: TaskStep[];
  currentStep: number;
  status: 'planning' | 'executing' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
}

export interface TaskStep {
  id: number;
  description: string;
  tool?: string;
  args?: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: string;
  error?: string;
}

// ── Agent Run Result ────────────────────────────────────────────
export interface AgentRunResult {
  response: string;
  toolsUsed: string[];
  messages: AgentMessage[];
  memory?: AgentMemory;
  taskPlan?: TaskPlan;
  suggestedActions?: SuggestedAction[];
}

export interface SuggestedAction {
  label: string;
  description: string;
  prompt: string;
  icon: string;
}

// ── n8n Workflow Types ──────────────────────────────────────────
export interface N8nTriggerResult {
  success: boolean;
  executionId?: string;
  error?: string;
}

// ── Provider Config ─────────────────────────────────────────────
export interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  supportsToolCalls: boolean;
  maxTokens: number;
}
