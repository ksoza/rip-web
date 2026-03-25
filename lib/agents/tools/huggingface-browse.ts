// lib/agents/tools/huggingface-browse.ts
// Tool: Browse HuggingFace models and spaces

export interface HFModel {
  id: string;
  author: string;
  modelId: string;
  downloads: number;
  likes: number;
  tags: string[];
  pipeline_tag: string;
  lastModified: string;
}

export async function searchHuggingFaceModels(
  query: string,
  options?: { task?: string; sort?: string; limit?: number },
): Promise<HFModel[]> {
  const params = new URLSearchParams({
    search: query,
    sort: options?.sort || 'downloads',
    direction: '-1',
    limit: String(options?.limit || 5),
  });

  if (options?.task) {
    params.set('pipeline_tag', options.task);
  }

  const headers: Record<string, string> = {};
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  if (hfKey) {
    headers['Authorization'] = `Bearer ${hfKey}`;
  }

  const res = await fetch(`https://huggingface.co/api/models?${params}`, { headers });

  if (!res.ok) {
    throw new Error(`HuggingFace search failed: ${res.status}`);
  }

  const models = await res.json();
  return models.map((m: any) => ({
    id: m.id || m.modelId,
    author: m.author || m.id?.split('/')[0] || '',
    modelId: m.modelId || m.id,
    downloads: m.downloads || 0,
    likes: m.likes || 0,
    tags: m.tags || [],
    pipeline_tag: m.pipeline_tag || '',
    lastModified: m.lastModified || '',
  }));
}

export async function getHuggingFaceModelCard(modelId: string): Promise<string> {
  const res = await fetch(`https://huggingface.co/${modelId}/raw/main/README.md`);
  if (!res.ok) return '(No model card found)';
  return (await res.text()).slice(0, 3000);
}
