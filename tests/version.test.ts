import { describe, expect, it } from 'vitest'
import { getVersionInfo } from '../server/utils/version'

describe('deployment version information', () => {
  it('exposes the immutable release metadata', () => {
    expect(getVersionInfo({
      APP_VERSION: 'abc123',
      APP_BUILD_TIME: '2026-08-06T08:00:00Z',
      NODE_ENV: 'production',
    })).toEqual({
      version: 'abc123',
      builtAt: '2026-08-06T08:00:00Z',
      environment: 'production',
    })
  })

  it('uses safe development defaults when build metadata is absent', () => {
    expect(getVersionInfo({})).toEqual({
      version: 'development',
      builtAt: null,
      environment: 'development',
    })
  })
})
