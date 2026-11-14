/**
 * Tiny in-memory sliding-window rate limiter, keyed by client IP.
 *
 * Why: every AI request uses the owner's Gemini quota, so a public deployment needs a brake.
 * Limit: on serverless hosts (Vercel) each instance has its own memory, so this is
 * best-effort protection against casual abuse, not a hard guarantee. For a hard limit,
 * swap the Map for a shared store (e.g. Upstash Redis) behind the same function.
 *
 * Tune the numbers below; nothing else needs to change.
 */
export const RATE_LIMITS = {
  /** Calls that use the LLM (research, writing analysis). */
  llm: { max: 10, windowMs: 60_000 },
  /** URL fetching on its own. */
  fetch: { max: 20, windowMs: 60_000 },
} as const;

type Bucket = keyof typeof RATE_LIMITS;

const hits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0].trim() : req.headers.get('x-real-ip')) || 'unknown';
}

/** Returns null if allowed, or the number of seconds to wait if the caller is over the limit. */
export function checkRateLimit(req: Request, bucket: Bucket, now: number = Date.now()): number | null {
  const { max, windowMs } = RATE_LIMITS[bucket];
  const key = `${bucket}:${clientIp(req)}`;
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    hits.set(key, recent);
    return Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
  }

  recent.push(now);
  hits.set(key, recent);

  // Keep memory bounded: occasionally drop idle keys.
  if (hits.size > 5000) {
    hits.forEach((times, k) => {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    });
  }
  return null;
}
