// lib/n8n.ts
// n8n Workflow Automation — REST API + MCP Server (Workflow SDK)
// MCP: Build workflows programmatically via JSON-RPC
// REST: Trigger webhooks, manage workflows, check executions
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

export interface MCPToolResult {
  content: { type: string; text: string }[];
  isError?: boolean;
}

// ═══════════════════════════════════════════════════════════════
//  MCP CLIENT — JSON-RPC 2.0 over HTTP/SSE
// ═══════════════════════════════════════════════════════════════

class N8nMCPClient {
  private url: string;
  private token: string;
  private sessionId: string | null = null;

  constructor() {
    this.url = process.env.N8N_MCP_URL || '';
    this.token = process.env.N8N_MCP_TOKEN || '';
  }

  get isConfigured(): boolean {
    return !!(this.url && this.token);
  }

  /** Send a JSON-RPC 2.0 request to the MCP server */
  private async rpc(method: string, params: Record<string, unknown> = {}, id: number = 1): Promise<any> {
    if (!this.isConfigured) throw new Error('n8n MCP not configured: set N8N_MCP_URL and N8N_MCP_TOKEN');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${this.token}`,
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;

    const res = await fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', method, params, id }),
    });

    if (!res.ok) throw new Error(`MCP error ${res.status}: ${await res.text()}`);

    // Parse SSE response
    const text = await res.text();
    const match = text.match(/data:\s*(\{.*\})/s);
    if (!match) throw new Error(`MCP: no data in response: ${text.slice(0, 200)}`);

    const data = JSON.parse(match[1]);

    // Capture session ID from first response
    if (!this.sessionId && res.headers.get('mcp-session-id')) {
      this.sessionId = res.headers.get('mcp-session-id');
    }

    if (data.error) throw new Error(`MCP error: ${data.error.message}`);
    return data.result;
  }

  /** Initialize the MCP session */
  async initialize(): Promise<{ serverInfo: any; capabilities: any }> {
    const result = await this.rpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'rip-web', version: '1.0' },
    });
    // Send initialized notification
    await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${this.token}`,
        ...(this.sessionId ? { 'Mcp-Session-Id': this.sessionId } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    }).catch(() => {});
    return result;
  }

  /** List available tools */
  async listTools(): Promise<any[]> {
    const result = await this.rpc('tools/list', {}, 2);
    return result.tools || [];
  }

  /** Call an MCP tool */
  async callTool(name: string, args: Record<string, unknown> = {}): Promise<MCPToolResult> {
    return this.rpc('tools/call', { name, arguments: args }, Date.now() % 100000);
  }

  // ── High-Level Workflow SDK Helpers ──────────────────────────

  /** Search for n8n nodes by name */
  async searchNodes(queries: string[]): Promise<MCPToolResult> {
    return this.callTool('search_nodes', { queries });
  }

  /** Get SDK reference docs */
  async getSDKReference(sections?: string[]): Promise<MCPToolResult> {
    return this.callTool('get_sdk_reference', sections ? { sections } : {});
  }

  /** Validate workflow code */
  async validateWorkflow(code: string): Promise<MCPToolResult> {
    return this.callTool('validate_workflow', { code });
  }

  /** Create a workflow from SDK code */
  async createWorkflow(code: string, description?: string): Promise<MCPToolResult> {
    return this.callTool('create_workflow_from_code', { code, description });
  }

  /** Update an existing workflow */
  async updateWorkflow(workflowId: string, code: string): Promise<MCPToolResult> {
    return this.callTool('update_workflow', { workflowId, code });
  }
}

// ═══════════════════════════════════════════════════════════════
//  REST API CLIENT — webhooks, executions, workflow management
// ═══════════════════════════════════════════════════════════════

class N8nRESTClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = (process.env.N8N_BASE_URL || '').replace(/\/$/, '');
    this.apiKey = process.env.N8N_API_KEY || '';
  }

  get isConfigured(): boolean {
    return !!(this.baseUrl && this.apiKey);
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.isConfigured) throw new Error('n8n REST not configured: set N8N_BASE_URL and N8N_API_KEY');

    const url = `${this.baseUrl}/api/v1${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) throw new Error(`n8n API error ${res.status}: ${await res.text()}`);
    return res.json();
  }

  // ── Workflows ──────────────────────────────────────────────

  async listWorkflows(): Promise<{ data: N8nWorkflow[] }> {
    return this.fetch('/workflows');
  }

  async getWorkflow(id: string): Promise<N8nWorkflow> {
    return this.fetch(`/workflows/${id}`);
  }

  async activateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.fetch(`/workflows/${id}/activate`, { method: 'POST' });
  }

  async deactivateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.fetch(`/workflows/${id}/deactivate`, { method: 'POST' });
  }

  // ── Executions ─────────────────────────────────────────────

  async listExecutions(workflowId?: string): Promise<{ data: N8nExecution[] }> {
    const params = workflowId ? `?workflowId=${workflowId}` : '';
    return this.fetch(`/executions${params}`);
  }

  async getExecution(id: string): Promise<N8nExecution> {
    return this.fetch(`/executions/${id}`);
  }

  // ── Webhook Triggers ───────────────────────────────────────

  async triggerWebhook(webhookPath: string, data: Record<string, unknown>, method: 'GET' | 'POST' = 'POST'): Promise<N8nWebhookResponse> {
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
}

// ═══════════════════════════════════════════════════════════════
//  SINGLETON EXPORTS
// ═══════════════════════════════════════════════════════════════

export const n8nMCP = new N8nMCPClient();
export const n8n = new N8nRESTClient();

// ═══════════════════════════════════════════════════════════════
//  PRE-CONFIGURED WEBHOOK PATHS
// ═══════════════════════════════════════════════════════════════
export const N8N_WEBHOOKS = {
  CREATION_COMPLETED:   'rip/creation-completed',
  CREATION_PUBLISHED:   'rip/creation-published',
  USER_SIGNUP:          'rip/user-signup',
  USER_SUBSCRIBED:      'rip/user-subscribed',
  USER_TIER_CHANGED:    'rip/tier-changed',
  PAYMENT_RECEIVED:     'rip/payment-received',
  REVENUE_SPLIT:        'rip/revenue-split',
  CONTENT_FLAGGED:      'rip/content-flagged',
  CONTENT_REVIEWED:     'rip/content-reviewed',
  NFT_MINTED:           'rip/nft-minted',
  COMMENT_POSTED:       'rip/comment-posted',
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
    console.error(`[n8n] Error triggering ${event}:`, err);
  }
}
