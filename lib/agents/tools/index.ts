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
