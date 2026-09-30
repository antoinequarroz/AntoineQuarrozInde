import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('Hermes Cockpit social publication boundary', () => {
  it('scopes every read to the paired device organization and includes document previews', () => {
    const route = read('server/api/hermes/mobile/social-posts.get.ts')
    expect(route).toContain('requireHermesMobileDevice(event)')
    expect(route).toContain(".eq('organization_id', device.organization_id)")
    expect(route).toContain('media_kind,media_url,media_title')
    expect(route).toContain("'private, no-store'")
  })

  it('requires an exact version and explicit confirmation before approval', () => {
    const route = read('server/api/hermes/mobile/social-posts/[id].post.ts')
    expect(route).toContain('validateExpectedVersion(body.version)')
    expect(route).toContain('SOCIAL_SCHEDULE_CONFIRMATION')
    expect(route).toContain('SOCIAL_PUBLISH_NOW_CONFIRMATION')
    expect(route).toContain(".eq('version', version)")
    expect(route).toContain("!['draft', 'failed'].includes(current.status)")
    expect(route).not.toContain('linkedin.com/rest/posts')
    expect(route).not.toContain('api.x.com')
  })
})
