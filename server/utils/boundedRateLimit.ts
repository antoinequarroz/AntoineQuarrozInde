export type BoundedRateLimitOptions = {
  windowMs: number
  maxRequests: number
  maxKeys: number
}

type RateLimitEntry = {
  count: number
  resetAt: number
}

/**
 * Small, process-local fixed-window limiter with a hard memory ceiling.
 *
 * It is intentionally best-effort: production-wide enforcement still belongs
 * in a shared store or at the edge. The bounded map prevents spoofed IPs from
 * growing a long-lived Node process without limit.
 */
export function createBoundedRateLimiter(options: BoundedRateLimitOptions) {
  if (options.windowMs <= 0 || options.maxRequests <= 0 || options.maxKeys <= 0) {
    throw new Error('Rate limiter options must be positive')
  }

  const entries = new Map<string, RateLimitEntry>()
  let checks = 0

  function pruneExpired(now: number) {
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(key)
    }
  }

  function evictOldestWindow() {
    let oldestKey: string | undefined
    let oldestReset = Number.POSITIVE_INFINITY
    for (const [key, entry] of entries) {
      if (entry.resetAt < oldestReset) {
        oldestKey = key
        oldestReset = entry.resetAt
      }
    }
    if (oldestKey !== undefined) entries.delete(oldestKey)
  }

  return {
    isAllowed(key: string, now = Date.now()) {
      checks += 1
      if (checks % 64 === 0) pruneExpired(now)

      const existing = entries.get(key)
      if (existing && existing.resetAt > now) {
        existing.count += 1
        return existing.count <= options.maxRequests
      }

      if (existing) entries.delete(key)
      if (entries.size >= options.maxKeys) {
        pruneExpired(now)
        if (entries.size >= options.maxKeys) evictOldestWindow()
      }

      entries.set(key, { count: 1, resetAt: now + options.windowMs })
      return true
    },
    size() {
      return entries.size
    },
  }
}
