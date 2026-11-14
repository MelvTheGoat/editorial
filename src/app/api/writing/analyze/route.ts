import { NextRequest, NextResponse } from 'next/server';
import { generateContent, parseModelJson } from '@/lib/gemini';
import { analyzeWritingRules, computeMetrics } from '@/lib/writing-rules';
import { deduplicateIssues } from '@/lib/dedupe';
import { checkRateLimit } from '@/lib/rate-limit';
import type {
  WritingAnalyzeRequest,
  WritingAnalyzeResponse,
  WritingIssue,
  WritingAnalysis,
} from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_TEXT = 50_000;

export async function POST(request: NextRequest) {
  const wait = checkRateLimit(request, 'llm');
  if (wait) {
    return NextResponse.json(
      { error: `Too many requests. Please try again in ${wait}s.` },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    );
  }

  try {
    let body: WritingAnalyzeRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body.' },
        { status: 400 }
      );
    }

    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "text" field. Provide text to analyze.' },
        { status: 400 }
      );
    }

    if (text.length > MAX_TEXT) {
      return NextResponse.json({ error: `Draft is too long (max ${MAX_TEXT.toLocaleString()} characters).` }, { status: 413 });
    }

    // Step 1: Deterministic analysis
    const ruleIssues = analyzeWritingRules(text);
    const metrics = computeMetrics(text);

    // Step 2: LLM-powered deep analysis
    let llmIssues: WritingIssue[] = [];
    let overallFeedback = '';
    let strengths: string[] = [];

    try {
      const prompt = `You are an expert writing editor reviewing a piece of writing for a newsletter. Analyze the following text and provide detailed feedback.

TEXT TO ANALYZE:
---
${text.slice(0, 8000)}
---

Respond with a JSON object matching this exact structure (no markdown, no code fences, just raw JSON):

{
  "issues": [
    {
      "type": "jargon | complex_paragraph | repetitive_phrasing",
      "severity": "suggestion | warning | important",
      "text": "The exact text from the original that has the issue (must be a substring of the original text)",
      "explanation": "Why this is an issue for readers",
      "suggestion": "Short advice on how to fix it",
      "replacement": "OPTIONAL. Exact text that can directly replace the flagged text (e.g. the jargon term plus a short plain-English gloss). Omit this field if the fix needs the writer's judgement, and always omit it for complex_paragraph."
    }
  ],
  "overallFeedback": "2-3 paragraphs of overall assessment: what works, what doesn't, and the single most impactful improvement the writer could make.",
  "strengths": [
    "Specific strength 1",
    "Specific strength 2",
    "Specific strength 3"
  ]
}

Focus on:
1. **Jargon**: Technical terms or acronyms that aren't explained. Only flag terms that a smart non-specialist wouldn't know.
2. **Complex paragraphs**: Paragraphs that try to cover too many ideas or are hard to follow. Quote the first sentence of the paragraph as "text".
3. **Repetitive phrasing**: Words or phrases that appear too many times and should be varied.

Important rules:
- The "text" field MUST be an exact substring of the original text (copy it exactly, including punctuation).
- Do NOT flag standard industry terms that the target audience would know.
- Limit to the 5-8 most impactful issues — quality over quantity.
- Be constructive and specific in suggestions.
- Strengths should be genuine and specific, not generic praise.`;

      const raw = await generateContent(prompt, { jsonMode: true });

      const parsed = parseModelJson<{
        issues?: Array<{
          type: string;
          severity: string;
          text: string;
          explanation: string;
          suggestion?: string;
          replacement?: string;
        }>;
        overallFeedback?: string;
        strengths?: string[];
      }>(raw);

      overallFeedback = parsed.overallFeedback || '';
      strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];

      if (Array.isArray(parsed.issues)) {
        let llmIdCounter = 1000;
        const analyzed = text.slice(0, 8000);
        for (const issue of parsed.issues) {
          if (!issue.text || !issue.type || !issue.explanation) continue;
          // Only keep issues we can anchor to the real text; an unanchored highlight is worse than none.
          const startIndex = analyzed.indexOf(issue.text);
          if (startIndex === -1) continue;
          const type = (['jargon', 'complex_paragraph', 'repetitive_phrasing'].includes(issue.type)
            ? issue.type
            : 'jargon') as WritingIssue['type'];
          llmIssues.push({
            id: `llm-${llmIdCounter++}`,
            type,
            severity: (['suggestion', 'warning', 'important'].includes(issue.severity)
              ? issue.severity
              : 'suggestion') as WritingIssue['severity'],
            text: issue.text,
            explanation: issue.explanation,
            suggestion: issue.suggestion,
            replacement:
              type !== 'complex_paragraph' && typeof issue.replacement === 'string' && issue.replacement.trim()
                ? issue.replacement
                : undefined,
            startIndex,
            endIndex: startIndex + issue.text.length,
          });
        }
      }
    } catch (llmError) {
      // If LLM fails, we still return the deterministic analysis
      const llmMessage =
        llmError instanceof Error ? llmError.message : 'LLM analysis failed';
      overallFeedback = `AI-powered analysis is unavailable right now, so this is rule-based analysis only. Details: ${llmMessage.slice(0, 200)}`;
      strengths = [];
    }

    // Step 3: Merge and deduplicate issues
    const mergedIssues = deduplicateIssues([...ruleIssues, ...llmIssues]);

    const analysis: WritingAnalysis = {
      metrics,
      issues: mergedIssues,
      overallFeedback:
        overallFeedback || 'Analysis complete. Review the issues above for improvement suggestions.',
      strengths,
    };

    const response: WritingAnalyzeResponse = { analysis };
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.';
    const status = message.includes('GEMINI_API_KEY') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
