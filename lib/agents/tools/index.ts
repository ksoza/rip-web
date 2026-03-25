// lib/agents/tools/index.ts
// Re-export all GhOSTface agent tools

export { searchGitHub, getRepoReadme, getRepoLanguages } from './github-search';
export type { GitHubSearchResult } from './github-search';

export { searchHuggingFaceModels, getHuggingFaceModelCard } from './huggingface-browse';
export type { HFModel } from './huggingface-browse';

export { webSearch } from './web-search';
export type { SearchResult } from './web-search';

export { analyzeCode } from './code-analysis';
export type { CodeAnalysis } from './code-analysis';

export { triggerN8nWorkflow, listN8nWorkflows, executeN8nWorkflow, RIP_WORKFLOWS } from './n8n-trigger';
export type { N8nToolResult, RipWorkflowEvent } from './n8n-trigger';

export { queryCreations, getPlatformStats, saveAgentMemory, searchTMDB } from './supabase-ops';
export type { SupabaseToolResult } from './supabase-ops';
