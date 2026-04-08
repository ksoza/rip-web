// app/api/img/route.ts
// Lightweight image proxy — bypasses Fandom wiki hotlink protection
// Usage: /api/img?url=https://static.wikia.nocookie.net/...
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url || !url.startsWith('https://')) {
    return new Response('Missing or invalid url', { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
    });

    if (!res.ok) {
      return new Response('Image not found', { status: 404 });
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    const body = await res.arrayBuffer();

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch {
    return new Response('Failed to fetch image', { status: 502 });
  }
}
