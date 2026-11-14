import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

let aiClient: GoogleGenerativeAI | null = null;

// Google retires models on a schedule (gemini-2.0-flash was shut down in June 2026), so the model is
// configurable and a 404 "model not found" falls through to the next candidate instead of failing.
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
].filter((m, i, arr): m is string => !!m && arr.indexOf(m) === i);
let workingModel: string | null = null;
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 2;

function getClient(): GoogleGenerativeAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not set. Please add it to your .env.local file.'
      );
    }
    aiClient = new GoogleGenerativeAI(apiKey);
  }
  return aiClient;
}

export function getModel(modelName: string = workingModel || MODEL_CANDIDATES[0]): GenerativeModel {
  return getClient().getGenerativeModel(
    { model: modelName },
    { timeout: REQUEST_TIMEOUT_MS }
  );
}

function isRetryable(message: string): boolean {
  return /\b(429|500|502|503|504)\b|overloaded|rate limit|timed? ?out|fetch failed/i.test(message);
}

/**
 * Generate text from a prompt. Retries once on transient errors (rate limit, 5xx, timeout).
 * Set `jsonMode` to request application/json output.
 */
export async function generateContent(
  prompt: string,
  options: { jsonMode?: boolean } = {}
): Promise<string> {
  const candidates = workingModel ? [workingModel] : MODEL_CANDIDATES;
  let lastError: unknown;

  for (const modelName of candidates) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const model = getModel(modelName);
        const generationConfig: Record<string, unknown> = { temperature: 0.3 };
        if (options.jsonMode) generationConfig.responseMimeType = 'application/json';

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig,
        });

        const text = result.response.text();
        if (!text) throw new Error('Gemini returned an empty response.');
        workingModel = modelName;
        return text;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('GEMINI_API_KEY')) throw error;
        // Retired / unknown model: move on to the next candidate immediately.
        if (/\b404\b|not found|no longer available/i.test(message)) break;
        if (attempt < MAX_ATTEMPTS && isRetryable(message)) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
          continue;
        }
        // Other errors (bad key, safety block, bad request) will not be fixed by another model.
        const detail = message;
        throw new Error(`Gemini API error: ${detail}`);
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Unknown Gemini API error';
  throw new Error(`Gemini API error (tried ${candidates.join(', ')}): ${message}`);
}

/** Parse JSON from a model response, tolerating stray markdown code fences. */
export function parseModelJson<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned) as T;
}
