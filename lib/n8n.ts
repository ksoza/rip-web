// lib/n8n.ts
// n8n Workflow Automation client
// Trigger workflows, manage executions, and handle webhooks
// Docs: https://docs.n8n.io/api/
// ═══════════════════════════════════════════════════════════════

// ── Types ────────────────────────────────────────────────────
export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags: { id: string; name: string }[];
  nodes: N8nNode[];
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, unknown>;
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt: string | null;
  workflowId: string;
  status: 'success' | 'error' | 'running' | 'waiting' | 'canceled';
  data?: Record<string, unknown>;
}

export interface N8nWebhookResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ── Client ───────────────────────────────────────────────────
class N8nClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = (process.env.N8N_BASE_URL || process.env.NEXT_PUBLIC_N8N_BASE_URL || '').replace(/\/$/, '');
    this.apiKey = process.env.N8N_API_KEY || '';
  }

  get isConfigured(): boolean {
    return !!(this.baseUrl && this.apiKey);
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.isConfigured) throw new Error('n8n not configured: set N8N_BASE_URL and N8N_API_KEY');

    const url = `${this.baseUrl}/api/v1${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`n8n API error ${res.status}: ${text}`);
    }

    return res.json();
  }

  // ── Workflows ──────────────────────────────────────────────

  /** List all workflows */
  async listWorkflows(): Promise<{ data: N8nWorkflow[] }> {
    return this.fetch('/workflows');
  }

  /** Get a specific workflow */
  async getWorkflow(id: string): Promise<N8nWorkflow> {
    return this.fetch(`/workflows/${id}`);
  }

  /** Activate a workflow */
  async activateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.fetch(`/workflows/${id}/activate`, { method: 'POST' });
  }

  /** Deactivate a workflow */
  async deactivateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.fetch(`/workflows/${id}/deactivate`, { method: 'POST' });
  }

  // ── Executions ─────────────────────────────────────────────

  /** List executions for a workflow */
  async listExecutions(workflowId?: string): Promise<{ data: N8nExecution[] }> {
    const params = workflowId ? `?workflowId=${workflowId}` : '';
    return this.fetch(`/executions${params}`);
  }

  /** Get execution details */
  async getExecution(id: string): Promise<N8nExecution> {
    return this.fetch(`/executions/${id}`);
  }

  // ── Webhook Triggers ───────────────────────────────────────

  /**
   * Trigger an n8n workflow via its webhook URL.
   * This is the primary integration point for RiP:
   * - Creation completed → trigger post-processing workflow
   * - User subscribed → trigger onboarding workflow  
   * - Content published → trigger distribution workflow
   * - Revenue event → trigger accounting workflow
   */
  async triggerWebhook(
    webhookPath: string,
    data: Record<string, unknown>,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<N8nWebhookResponse> {
    const url = `${this.baseUrl}/webhook/${webhookPath}`;
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify(data) : undefined,
      });
      
      const responseData = await res.json().catch(() => null);
      return { success: res.ok, data: responseData };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * Trigger a test webhook (for development).
   * n8n provides separate test and production webhook URLs.
   */
  async triggerTestWebhook(
    webhookPath: string,
    data: Record<string, unknown>
  ): Promise<N8nWebhookResponse> {
    const url = `${this.baseUrl}/webhook-test/${webhookPath}`;
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const responseData = await res.json().catch(() => null);
      return { success: res.ok, data: responseData };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}

// ── Singleton export ─────────────────────────────────────────
export const n8n = new N8nClient();

// ═══════════════════════════════════════════════════════════════
//  PRE-CONFIGURED WEBHOOK PATHS (set up in n8n dashboard)
//  These map to specific automation workflows in n8n
// ═══════════════════════════════════════════════════════════════
export const N8N_WEBHOOKS = {
  // Creation pipeline
  CREATION_COMPLETED:   'rip/creation-completed',    // After AI generation finishes
  CREATION_PUBLISHED:   'rip/creation-published',    // After user publishes to Discover
  
  // User lifecycle
  USER_SIGNUP:          'rip/user-signup',            // New user registered
  USER_SUBSCRIBED:      'rip/user-subscribed',        // Subscription activated
  USER_TIER_CHANGED:    'rip/tier-changed',           // Plan upgrade/downgrade
  
  // Revenue & payments
  PAYMENT_RECEIVED:     'rip/payment-received',       // Stripe payment success
  REVENUE_SPLIT:        'rip/revenue-split',          // Trigger revenue distribution
  
  // Content moderation
  CONTENT_FLAGGED:      'rip/content-flagged',        // Content reported
  CONTENT_REVIEWED:     'rip/content-reviewed',       // Moderation complete
  
  // Social
  NFT_MINTED:           'rip/nft-minted',             // NFT created
  COMMENT_POSTED:       'rip/comment-posted',         // New comment
  
  // Scheduled tasks (triggered by n8n cron, not from RiP)
  // WEEKLY_GEN_RESET:  handled by n8n cron internally
  // DAILY_TRENDING:    handled by n8n cron internally
  // STAKING_REWARDS:   handled by n8n cron internally
} as const;

// ── Helper: fire-and-forget webhook trigger ──────────────────
export async function triggerN8nEvent(
  event: keyof typeof N8N_WEBHOOKS,
  payload: Record<string, unknown>
): Promise<void> {
  if (!n8n.isConfigured) {
    console.log(`[n8n] Not configured, skipping event: ${event}`);
    return;
  }
  
  try {
    const webhookPath = N8N_WEBHOOKS[event];
    const result = await n8n.triggerWebhook(webhookPath, {
      event,
      timestamp: new Date().toISOString(),
      ...payload,
    });
    
    if (!result.success) {
      console.error(`[n8n] Webhook failed for ${event}:`, result.error);
    }
  } catch (err) {
    // Non-blocking — don't fail the main request if n8n is down
    console.error(`[n8n] Error triggering ${event}:`, err);
  }
}
