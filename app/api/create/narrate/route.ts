// REMOVED -- replaced by /api/generate/scene (unified video+audio pipeline)
// Returns 410 Gone for any cached client requests.
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint has been removed. Use /api/generate/scene instead.' },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint has been removed. Use /api/generate/scene instead.' },
    { status: 410 }
  );
}
