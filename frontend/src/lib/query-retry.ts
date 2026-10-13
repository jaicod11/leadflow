// Query retry policy, tuned for a free-tier API that may be cold-starting.

import { ApiError } from "@/lib/api/errors";

/** Unreachable (0) or gateway errors, which a waking server returns. 4xx/500 are not retried. */
const RETRYABLE_STATUSES = new Set([0, 502, 503, 504]);
const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 15_000;

/** React Query `retry`: up to 3 retries, and only for errors a cold start can cause. */
export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  return (
    failureCount < MAX_RETRIES &&
    error instanceof ApiError &&
    RETRYABLE_STATUSES.has(error.status)
  );
}

/** React Query `retryDelay`: exponential backoff (2 s, 4 s, 8 s, …, capped at 15 s). */
export function queryRetryDelay(failureCount: number): number {
  return Math.min(2000 * 2 ** failureCount, MAX_RETRY_DELAY_MS);
}
