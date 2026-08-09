import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const cockpitReadRoute = readFileSync(new URL('../server/api/project-cockpit.get.ts', import.meta.url), 'utf8')
const cockpitWriteRoute = readFileSync(new URL('../server/api/project-cockpit.put.ts', import.meta.url), 'utf8')

describe('project cockpit access', () => {
  it('allows organization viewers to read the cockpit', () => {
    expect(cockpitReadRoute).toContain("requireAuth: true, minRole: 'viewer'")
    expect(cockpitReadRoute).not.toContain('requireAdmin(event)')
  })

  it('keeps cockpit mutations restricted to managers', () => {
    expect(cockpitWriteRoute).toContain('requireAdmin(event)')
  })
})
