import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Deployment smoke test. Reports whether the LLM key is configured, never the key itself. */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    llmConfigured: Boolean(process.env.GEMINI_API_KEY),
    modelOverride: process.env.GEMINI_MODEL || null,
  });
}
