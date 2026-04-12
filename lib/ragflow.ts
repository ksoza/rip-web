// lib/ragflow.ts
// RAGflow integration - Show Knowledge Base
// Self-hosted RAG engine for accurate show/movie details
// Creates per-show datasets with scripts, character profiles, visual refs
// API: http://<ragflow-host>/api/v1 with Bearer token auth

// -- Configuration ------------------------------------------------

const RAGFLOW_URL = process.env.RAGFLOW_API_URL || '';
const RAGFLOW_KEY = process.env.RAGFLOW_API_KEY || '';
const API_VERSION = 'v1';

// -- Types --------------------------------------------------------

export interface RagflowDataset {
  id: string;
  name: string;
  description?: string;
  chunkMethod?: string;
  documentCount?: number;
  chunkCount?: number;
  embeddingModel?: string;
}

export interface RagflowDocument {
  id: string;
  datasetId: string;
  name: string;
  type?: string;
  size?: number;
  chunkCount?: number;
  status?: string;
}

export interface RagflowChunk {
  id: string;
  content: string;
  documentId?: string;
  documentName?: string;
  similarity?: number;
  metadata?: Record<string, unknown>;
}

export interface RagflowSearchResult {
  chunks: RagflowChunk[];
  totalCount: number;
  query: string;
}

export interface RagflowChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RagflowChatResult {
  answer: string;
  references: RagflowChunk[];
  sessionId?: string;
}

// -- Status check -------------------------------------------------

export function isRagflowAvailable(): boolean {
  return !!(RAGFLOW_URL && RAGFLOW_KEY);
}

export function getRagflowStatus(): {
  available: boolean;
  serverUrl?: string;
} {
  return {
    available: isRagflowAvailable(),
    serverUrl: RAGFLOW_URL || undefined,
  };
}

// -- HTTP client --------------------------------------------------

function apiUrl(path: string): string {
  const base = RAGFLOW_URL.replace(/\/+$/, '');
  return `${base}/api/${API_VERSION}${path}`;
}

function authHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${RAGFLOW_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function ragflowFetch<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string>
): Promise<{ success: boolean; data?: T; error?: string }> {
  if (!isRagflowAvailable()) {
    return { success: false, error: 'RAGflow not configured. Set RAGFLOW_API_URL and RAGFLOW_API_KEY.' };
  }

  try {
    let url = apiUrl(path);
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url += `?${qs}`;
    }

    const opts: RequestInit = {
      method,
      headers: authHeaders(),
    };
    if (body && method !== 'GET') {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(url, opts);
    const json = await res.json();

    if (json.code === 0) {
      return { success: true, data: json.data as T };
    }
    return { success: false, error: json.message || `RAGflow error code ${json.code}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `RAGflow request failed: ${msg}` };
  }
}

// -- Dataset management -------------------------------------------

/** Create a show knowledge dataset */
export async function createDataset(
  name: string,
  description?: string,
  chunkMethod: string = 'naive'
): Promise<{ success: boolean; dataset?: RagflowDataset; error?: string }> {
  const result = await ragflowFetch<RagflowDataset>('POST', '/datasets', {
    name,
    description,
    chunk_method: chunkMethod,
    permission: 'me',
  });
  return { success: result.success, dataset: result.data, error: result.error };
}

/** List all datasets */
export async function listDatasets(
  page: number = 1,
  pageSize: number = 50
): Promise<{ success: boolean; datasets?: RagflowDataset[]; error?: string }> {
  const result = await ragflowFetch<RagflowDataset[]>('GET', '/datasets', undefined, {
    page: String(page),
    page_size: String(pageSize),
  });
  return { success: result.success, datasets: result.data, error: result.error };
}

/** Get or create a dataset for a specific show */
export async function getOrCreateShowDataset(
  showId: string,
  showTitle: string
): Promise<{ success: boolean; dataset?: RagflowDataset; error?: string }> {
  const datasetName = `rip-${showId}`;

  // Try to find existing
  const listResult = await ragflowFetch<RagflowDataset[]>('GET', '/datasets', undefined, {
    name: datasetName,
    page: '1',
    page_size: '1',
  });

  if (listResult.success && listResult.data && listResult.data.length > 0) {
    return { success: true, dataset: listResult.data[0] };
  }

  // Create new
  return createDataset(
    datasetName,
    `Knowledge base for ${showTitle} - scripts, character profiles, visual references, episode guides`
  );
}

// -- Document upload ----------------------------------------------

/** Upload a text document to a dataset */
export async function uploadDocument(
  datasetId: string,
  fileName: string,
  content: string
): Promise<{ success: boolean; document?: RagflowDocument; error?: string }> {
  if (!isRagflowAvailable()) {
    return { success: false, error: 'RAGflow not configured' };
  }

  try {
    // RAGflow expects multipart form upload for documents
    const blob = new Blob([content], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, fileName);

    const url = apiUrl(`/datasets/${datasetId}/documents`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RAGFLOW_KEY}` },
      body: formData,
    });

    const json = await res.json();
    if (json.code === 0) {
      return { success: true, document: json.data as RagflowDocument };
    }
    return { success: false, error: json.message };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/** Upload structured show knowledge (character profiles, visual guide, etc.) */
export async function uploadShowKnowledge(
  datasetId: string,
  showTitle: string,
  knowledge: {
    characterProfiles?: string;
    visualGuide?: string;
    episodeGuide?: string;
    dialogueSamples?: string;
    customContent?: Array<{ name: string; content: string }>;
  }
): Promise<{ success: boolean; uploaded: string[]; errors: string[] }> {
  const uploaded: string[] = [];
  const errors: string[] = [];

  const docs: Array<{ name: string; content: string }> = [];

  if (knowledge.characterProfiles) {
    docs.push({ name: `${showTitle} - Character Profiles.txt`, content: knowledge.characterProfiles });
  }
  if (knowledge.visualGuide) {
    docs.push({ name: `${showTitle} - Visual Style Guide.txt`, content: knowledge.visualGuide });
  }
  if (knowledge.episodeGuide) {
    docs.push({ name: `${showTitle} - Episode Guide.txt`, content: knowledge.episodeGuide });
  }
  if (knowledge.dialogueSamples) {
    docs.push({ name: `${showTitle} - Dialogue Samples.txt`, content: knowledge.dialogueSamples });
  }
  if (knowledge.customContent) {
    docs.push(...knowledge.customContent);
  }

  for (const doc of docs) {
    const result = await uploadDocument(datasetId, doc.name, doc.content);
    if (result.success) {
      uploaded.push(doc.name);
    } else {
      errors.push(`${doc.name}: ${result.error}`);
    }
  }

  return { success: errors.length === 0, uploaded, errors };
}

// -- Search / Retrieval -------------------------------------------

/** Search across one or more datasets */
export async function searchKnowledge(
  query: string,
  datasetIds: string[],
  options?: {
    topK?: number;
    similarityThreshold?: number;
    rerank?: boolean;
  }
): Promise<RagflowSearchResult> {
  const topK = options?.topK ?? 5;
  const threshold = options?.similarityThreshold ?? 0.3;

  // RAGflow uses the chat/retrieval endpoint for search
  const result = await ragflowFetch<{
    chunks: Array<{
      id: string;
      content_with_weight: string;
      document_id: string;
      document_keyword: string;
      similarity: number;
      metadata?: Record<string, unknown>;
    }>;
    total: number;
  }>('POST', '/retrieval', {
    question: query,
    dataset_ids: datasetIds,
    top_k: topK,
    similarity_threshold: threshold,
    rerank_id: options?.rerank ? undefined : null,
  });

  if (!result.success || !result.data) {
    return { chunks: [], totalCount: 0, query };
  }

  return {
    chunks: result.data.chunks.map((c) => ({
      id: c.id,
      content: c.content_with_weight,
      documentId: c.document_id,
      documentName: c.document_keyword,
      similarity: c.similarity,
      metadata: c.metadata,
    })),
    totalCount: result.data.total,
    query,
  };
}

/** Search for show-specific knowledge */
export async function searchShowKnowledge(
  showId: string,
  showTitle: string,
  query: string,
  topK: number = 5
): Promise<RagflowSearchResult> {
  // Get the show's dataset
  const dsResult = await getOrCreateShowDataset(showId, showTitle);
  if (!dsResult.success || !dsResult.dataset) {
    return { chunks: [], totalCount: 0, query };
  }

  return searchKnowledge(query, [dsResult.dataset.id], { topK });
}

// -- Chat with knowledge ------------------------------------------

/** Create a chat assistant for a show */
export async function createShowChat(
  name: string,
  datasetIds: string[],
  systemPrompt?: string
): Promise<{ success: boolean; chatId?: string; error?: string }> {
  const result = await ragflowFetch<{ id: string }>('POST', '/chats', {
    name,
    dataset_ids: datasetIds,
    prompt_config: systemPrompt ? { system: systemPrompt } : undefined,
  });

  if (result.success && result.data) {
    return { success: true, chatId: result.data.id };
  }
  return { success: false, error: result.error };
}

// -- Scene enrichment helper --------------------------------------

/**
 * Enrich a scene prompt with RAG knowledge.
 * Queries the show's knowledge base for relevant details
 * and injects them into the prompt for more accurate generation.
 */
export async function enrichScenePrompt(
  showId: string,
  showTitle: string,
  sceneDescription: string,
  characters: string[]
): Promise<{
  enrichedPrompt: string;
  ragContext: string;
  chunks: RagflowChunk[];
}> {
  if (!isRagflowAvailable()) {
    return { enrichedPrompt: sceneDescription, ragContext: '', chunks: [] };
  }

  // Build a targeted query
  const charList = characters.join(', ');
  const query = `${showTitle} scene: ${sceneDescription}. Characters: ${charList}. Visual style, setting details, character appearance, dialogue style.`;

  const result = await searchShowKnowledge(showId, showTitle, query, 5);

  if (result.chunks.length === 0) {
    return { enrichedPrompt: sceneDescription, ragContext: '', chunks: [] };
  }

  // Build RAG context from retrieved chunks
  const ragContext = result.chunks
    .map((c, i) => `[Ref ${i + 1}] ${c.content}`)
    .join('\n\n');

  // Enrich the prompt
  const enrichedPrompt = [
    sceneDescription,
    '',
    '--- Show Knowledge (from RAGflow) ---',
    ragContext,
  ].join('\n');

  return { enrichedPrompt, ragContext, chunks: result.chunks };
}
