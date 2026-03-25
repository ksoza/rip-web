// app/api/airbyte/sync/route.ts
// Trigger Airbyte syncs and check sync status
import { NextRequest, NextResponse } from 'next/server';
import {
  isAirbyteConfigured,
  triggerSync,
  getJob,
  listConnections,
  listJobs,
} from '@/lib/airbyte';

// POST — Trigger a sync for a connection
export async function POST(req: NextRequest) {
  try {
    if (!isAirbyteConfigured()) {
      return NextResponse.json(
        { error: 'Airbyte not configured. Set AIRBYTE_API_KEY and AIRBYTE_WORKSPACE_ID.' },
        { status: 503 },
      );
    }

    const { connectionId } = await req.json();

    if (!connectionId) {
      return NextResponse.json(
        { error: 'connectionId is required' },
        { status: 400 },
      );
    }

    const job = await triggerSync(connectionId);

    return NextResponse.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      connectionId,
    });
  } catch (err: any) {
    console.error('Airbyte sync error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to trigger sync' },
      { status: 500 },
    );
  }
}

// GET — List connections and recent jobs
export async function GET(req: NextRequest) {
  try {
    if (!isAirbyteConfigured()) {
      return NextResponse.json(
        { error: 'Airbyte not configured. Set AIRBYTE_API_KEY and AIRBYTE_WORKSPACE_ID.' },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    const connectionId = searchParams.get('connectionId');

    // If jobId provided, return that specific job status
    if (jobId) {
      const job = await getJob(Number(jobId));
      return NextResponse.json({ job });
    }

    // Otherwise list connections and recent jobs
    const [connections, jobs] = await Promise.all([
      listConnections(),
      listJobs(connectionId || undefined),
    ]);

    return NextResponse.json({ connections, jobs });
  } catch (err: any) {
    console.error('Airbyte status error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to get Airbyte status' },
      { status: 500 },
    );
  }
}
