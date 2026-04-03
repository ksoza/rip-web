// app/api/n8n/route.ts
// n8n Workflow Automation API
// POST /api/n8n  → trigger a webhook
// GET  /api/n8n  → list workflows / check health

import { NextRequest, NextResponse } from 'next/server';
import { n8n, N8N_WEBHOOKS, triggerN8nEvent } from '@/lib/n8n';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'health';

  try {
    switch (action) {
      case 'health': {
        const isConfigured = n8n.isConfigured;
        if (!isConfigured) {
          return NextResponse.json({
            status: 'not_configured',
            message: 'Set N8N_BASE_URL and N8N_API_KEY environment variables',
            webhooks: N8N_WEBHOOKS,
          });
        }
        return NextResponse.json({ status: 'configured', webhooks: N8N_WEBHOOKS });
      }

      case 'workflows': {
        const data = await n8n.listWorkflows();
        return NextResponse.json({
          total: data.data.length,
          workflows: data.data.map(w => ({
            id: w.id,
            name: w.name,
            active: w.active,
            updatedAt: w.updatedAt,
          })),
        });
      }

      case 'executions': {
        const workflowId = searchParams.get('workflowId') || undefined;
        const data = await n8n.listExecutions(workflowId);
        return NextResponse.json({
          total: data.data.length,
          executions: data.data.map(e => ({
            id: e.id,
            workflowId: e.workflowId,
            status: e.status,
            startedAt: e.startedAt,
            stoppedAt: e.stoppedAt,
          })),
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    console.error('[n8n API]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'n8n API error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, payload } = body;

    if (!event) {
      return NextResponse.json({ error: 'Missing event field' }, { status: 400 });
    }

    // Validate event is a known webhook
    if (!(event in N8N_WEBHOOKS)) {
      return NextResponse.json(
        { error: `Unknown event: ${event}. Valid: ${Object.keys(N8N_WEBHOOKS).join(', ')}` },
        { status: 400 }
      );
    }

    await triggerN8nEvent(event as keyof typeof N8N_WEBHOOKS, payload || {});

    return NextResponse.json({
      success: true,
      event,
      message: `Triggered webhook: ${N8N_WEBHOOKS[event as keyof typeof N8N_WEBHOOKS]}`,
    });
  } catch (err) {
    console.error('[n8n API]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'n8n trigger failed' },
      { status: 500 }
    );
  }
}
