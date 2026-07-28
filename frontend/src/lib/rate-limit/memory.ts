/**
 * In-memory rate limiter — emergency hotfix.
 *
 * Per function-instance counters. Caveats:
 * - State is NOT shared across Vercel instances (attacker hitting different
 *   instances gets a fresh counter each time). Adequate for single-user
 *   spam, not for distributed attacks.
 * - State is lost on cold start.
 *
 * This is a stopgap. The proper Postgres-backed limiter is tracked in
 * RATE_LIMITING.md (PR 1 — foundation).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export type RateLimitResult =
  | { allowed: true; retryAfterMs: 0 }
  | { allowed: false; retryAfterMs: number };

export function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) sweep(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

function sweep(now: number) {
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}
