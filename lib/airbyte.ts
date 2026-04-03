// lib/airbyte.ts
// Airbyte API client for data pipeline integration
// Manages workspaces, sources, destinations, connections, and sync triggers

const AIRBYTE_API_URL = 'https://api.airbyte.com/v1';

// ── Configuration ───────────────────────────────────────────────
export function isAirbyteConfigured(): boolean {
  return !!(process.env.AIRBYTE_API_KEY && process.env.AIRBYTE_WORKSPACE_ID);
}

function getAirbyteHeaders(): Record<string, string> {
  const apiKey = process.env.AIRBYTE_API_KEY;
  if (!apiKey) throw new Error('AIRBYTE_API_KEY not configured');

  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

function getWorkspaceId(): string {
  const id = process.env.AIRBYTE_WORKSPACE_ID;
  if (!id) throw new Error('AIRBYTE_WORKSPACE_ID not configured');
  return id;
}

// ── Types ───────────────────────────────────────────────────────
export interface AirbyteWorkspace {
  workspaceId: string;
  name: string;
  dataResidency: string;
}

export interface AirbyteConnection {
  connectionId: string;
  name: string;
  sourceId: string;
  destinationId: string;
  status: 'active' | 'inactive' | 'deprecated';
  schedule?: {
    scheduleType: string;
    cronExpression?: string;
  };
}

export interface AirbyteJob {
  jobId: number;
  status: 'pending' | 'running' | 'incomplete' | 'failed' | 'succeeded' | 'cancelled';
  jobType: string;
  startTime: string;
  connectionId: string;
  duration?: string;
  bytesSynced?: number;
  rowsSynced?: number;
}

// ── Workspace Operations ────────────────────────────────────────
export async function getWorkspace(): Promise<AirbyteWorkspace> {
  const res = await fetch(`${AIRBYTE_API_URL}/workspaces/${getWorkspaceId()}`, {
    headers: getAirbyteHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Airbyte workspace error: ${await res.text()}`);
  }

  return res.json();
}

// ── Connection Operations ───────────────────────────────────────
export async function listConnections(): Promise<AirbyteConnection[]> {
  const res = await fetch(`${AIRBYTE_API_URL}/connections?workspaceId=${getWorkspaceId()}`, {
    headers: getAirbyteHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Airbyte connections error: ${await res.text()}`);
  }

  const data = await res.json();
  return data.data || [];
}

export async function getConnection(connectionId: string): Promise<AirbyteConnection> {
  const res = await fetch(`${AIRBYTE_API_URL}/connections/${connectionId}`, {
    headers: getAirbyteHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Airbyte connection error: ${await res.text()}`);
  }

  return res.json();
}

export async function createConnection(params: {
  name: string;
  sourceId: string;
  destinationId: string;
  schedule?: { scheduleType: string; cronExpression?: string };
  configurations?: {
    streams: { name: string; syncMode: string }[];
  };
}): Promise<AirbyteConnection> {
  const res = await fetch(`${AIRBYTE_API_URL}/connections`, {
    method: 'POST',
    headers: getAirbyteHeaders(),
    body: JSON.stringify({
      ...params,
      workspaceId: getWorkspaceId(),
    }),
  });

  if (!res.ok) {
    throw new Error(`Airbyte create connection error: ${await res.text()}`);
  }

  return res.json();
}

export async function updateConnectionStatus(
  connectionId: string,
  status: 'active' | 'inactive',
): Promise<AirbyteConnection> {
  const res = await fetch(`${AIRBYTE_API_URL}/connections/${connectionId}`, {
    method: 'PATCH',
    headers: getAirbyteHeaders(),
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error(`Airbyte update connection error: ${await res.text()}`);
  }

  return res.json();
}

// ── Sync / Job Operations ───────────────────────────────────────
export async function triggerSync(connectionId: string): Promise<AirbyteJob> {
  const res = await fetch(`${AIRBYTE_API_URL}/jobs`, {
    method: 'POST',
    headers: getAirbyteHeaders(),
    body: JSON.stringify({
      connectionId,
      jobType: 'sync',
    }),
  });

  if (!res.ok) {
    throw new Error(`Airbyte sync trigger error: ${await res.text()}`);
  }

  return res.json();
}

export async function getJob(jobId: number): Promise<AirbyteJob> {
  const res = await fetch(`${AIRBYTE_API_URL}/jobs/${jobId}`, {
    headers: getAirbyteHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Airbyte job error: ${await res.text()}`);
  }

  return res.json();
}

export async function listJobs(connectionId?: string): Promise<AirbyteJob[]> {
  const params = new URLSearchParams({
    workspaceId: getWorkspaceId(),
    ...(connectionId ? { connectionId } : {}),
    limit: '10',
    orderBy: 'createdAt|DESC',
  });

  const res = await fetch(`${AIRBYTE_API_URL}/jobs?${params}`, {
    headers: getAirbyteHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Airbyte jobs error: ${await res.text()}`);
  }

  const data = await res.json();
  return data.data || [];
}

// ── Source Operations ───────────────────────────────────────────
export async function listSources(): Promise<any[]> {
  const res = await fetch(`${AIRBYTE_API_URL}/sources?workspaceId=${getWorkspaceId()}`, {
    headers: getAirbyteHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Airbyte sources error: ${await res.text()}`);
  }

  const data = await res.json();
  return data.data || [];
}

// ── Destination Operations ──────────────────────────────────────
export async function listDestinations(): Promise<any[]> {
  const res = await fetch(`${AIRBYTE_API_URL}/destinations?workspaceId=${getWorkspaceId()}`, {
    headers: getAirbyteHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Airbyte destinations error: ${await res.text()}`);
  }

  const data = await res.json();
  return data.data || [];
}
