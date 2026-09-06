import { describe, expect, it } from 'vitest'
import { createBoundedRateLimiter } from '../server/utils/boundedRateLimit'

describe('bounded in-memory rate limiter', () => {
  it('enforces the request limit and resets after the window', () => {
    const limiter = createBoundedRateLimiter({ windowMs: 1_000, maxRequests: 2, maxKeys: 10 })

    expect(limiter.isAllowed('client', 0)).toBe(true)
    expect(limiter.isAllowed('client', 1)).toBe(true)
    expect(limiter.isAllowed('client', 2)).toBe(false)
    expect(limiter.isAllowed('client', 1_000)).toBe(true)
  })

  it('never retains more keys than its configured memory ceiling', () => {
    const limiter = createBoundedRateLimiter({ windowMs: 60_000, maxRequests: 1, maxKeys: 3 })
    for (let index = 0; index < 100; index += 1) {
      expect(limiter.isAllowed(`spoofed-${index}`, index)).toBe(true)
      expect(limiter.size()).toBeLessThanOrEqual(3)
    }
  })
})
