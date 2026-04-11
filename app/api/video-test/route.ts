// REMOVED -- test/debug route, no longer needed
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Test route removed.' }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: 'Test route removed.' }, { status: 410 });
}
