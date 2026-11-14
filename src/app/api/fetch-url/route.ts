import { NextRequest, NextResponse } from 'next/server';
import { fetchUrlContent, validateFetchableUrl } from '@/lib/url-fetcher';
import { checkRateLimit } from '@/lib/rate-limit';
import type { FetchUrlRequest, FetchUrlResponse } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const wait = checkRateLimit(request, 'fetch');
  if (wait) {
    return NextResponse.json(
      { error: `Too many requests. Please try again in ${wait}s.` },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    );
  }

  try {
    let body: FetchUrlRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body.' },
        { status: 400 }
      );
    }

    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "url" field. Provide a valid URL string.' },
        { status: 400 }
      );
    }

    const urlError = validateFetchableUrl(url);
    if (urlError) {
      return NextResponse.json({ error: urlError }, { status: 400 });
    }

    const source = await fetchUrlContent(url);

    const response: FetchUrlResponse = { source };
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
