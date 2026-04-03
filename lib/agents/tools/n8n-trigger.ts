// lib/agents/tools/n8n-trigger.ts
// Tool: Trigger n8n workflows from within the GhOSTface agent
// Enables the agent to orchestrate automation workflows

export interface N8nToolResult {
  success: boolean;
  message: string;
  executionId?: string;
  data?: any;
}

// ── RiP Workflow Events ─────────────────────────────────────────
export const RIP_WORKFLOWS = {
  'content.generated': 'Fires when new AI content is generated (script, scene, character)',
  'content.published': 'Fires when a creation is published to Discover',
  'user.subscribed': 'Fires when a user subscribes to a paid plan',
  'user.cancelled': 'Fires when a user cancels their subscription',
  'payment.received': 'Fires when a payment is received via Stripe',
  'nft.minted': 'Fires when a creation is minted as an NFT',
  'staking.started': 'Fires when a user stakes $RIP tokens',
  'export.completed': 'Fires when a video/audio export finishes',
  'analytics.daily': 'Fires daily to compile analytics',
  'moderation.flagged': 'Fires when content is flagged for review',
} as const;

export type RipWorkflowEvent = keyof typeof RIP_WORKFLOWS;

// ── Trigger a webhook-based n8n workflow ────────────────────────
export async function triggerN8nWorkflow(
  event: string,
  payload: Record<string, any>,
): Promise<N8nToolResult> {
  const baseUrl = process.env.N8N_BASE_URL || process.env.NEXT_PUBLIC_N8N_BASE_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!baseUrl) {
    return {
      success: false,
      message: 'n8n not configured — N8N_BASE_URL not set. Configure in Settings → Integrations.',
    };
  }

  try {
    // Try webhook endpoint first (production n8n)
    const webhookUrl = `${baseUrl.replace(/\/$/, '')}/webhook/rip-${event.replace('.', '-')}`;
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-N8N-API-KEY': apiKey } : {}),
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: true,
        message: `Workflow triggered: ${event}`,
        data,
      };
    }

    return {
      success: false,
      message: `n8n webhook returned ${res.status}: ${await res.text()}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `n8n connection error: ${err.message}. Is n8n running at ${baseUrl}?`,
    };
  }
}

// ── List available workflows (for agent awareness) ──────────────
export async function listN8nWorkflows(): Promise<N8nToolResult> {
  const baseUrl = process.env.N8N_BASE_URL || process.env.NEXT_PUBLIC_N8N_BASE_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!baseUrl || !apiKey) {
    // Return built-in RiP workflows even if n8n isn't configured
    return {
      success: true,
      message: 'Available RiP workflow events (n8n webhook triggers):',
      data: Object.entries(RIP_WORKFLOWS).map(([event, desc]) => ({ event, description: desc })),
    };
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/workflows?active=true`, {
      headers: { 'X-N8N-API-KEY': apiKey },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = await res.json();

    return {
      success: true,
      message: `Found ${data.length} active workflows`,
      data: data.map((w: any) => ({
        id: w.id,
        name: w.name,
        active: w.active,
        tags: w.tags?.map((t: any) => t.name) || [],
      })),
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Could not list workflows: ${err.message}`,
      data: Object.entries(RIP_WORKFLOWS).map(([event, desc]) => ({ event, description: desc })),
    };
  }
}

// ── Execute a specific workflow by ID ───────────────────────────
export async function executeN8nWorkflow(
  workflowId: string,
  payload: Record<string, any> = {},
): Promise<N8nToolResult> {
  const baseUrl = process.env.N8N_BASE_URL || process.env.NEXT_PUBLIC_N8N_BASE_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!baseUrl || !apiKey) {
    return { success: false, message: 'n8n not configured' };
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/executions`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workflowId, data: payload }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();

    return {
      success: true,
      message: `Workflow ${workflowId} execution started`,
      executionId: data.id,
      data,
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
