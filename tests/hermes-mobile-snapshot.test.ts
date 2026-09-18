import { describe, expect, it } from 'vitest'
import {
  createHermesMobileToken,
  hashHermesMobileToken,
  validateHermesMobileSnapshot,
  validateHermesMobileToken,
} from '../server/utils/hermesMobile'

const snapshot = {
  schemaVersion: 1,
  sourceFetchedAt: '2026-09-18T11:00:00Z',
  projects: [{ id: 'project:1', label: 'Business', parentId: null, archived: false }],
  profiles: [{ name: 'jarvis', label: 'JARVIS', model: 'gpt-5.6', provider: 'OpenAI' }],
  missions: [{ id: 'mission:1', title: 'Veille', owner: 'jarvis', projectId: 'project:1', status: 'Planifiée', lastStatus: null, nextRunAt: null }],
  reviews: [{ id: 'report:1', title: 'Rapport', projectId: 'project:1', decision: 'À relire', addedAt: '2026-09-18T10:00:00Z' }],
}

describe('Hermes mobile snapshot boundary', () => {
  it('keeps only the read-only fields allowed on a phone', () => {
    const parsed = validateHermesMobileSnapshot({
      ...snapshot,
      password: 'must-not-leak',
      reviews: [{ ...snapshot.reviews[0], content: 'private-report-body', note: 'private-note' }],
    })
    expect(JSON.stringify(parsed)).not.toContain('must-not-leak')
    expect(JSON.stringify(parsed)).not.toContain('private-report-body')
    expect(JSON.stringify(parsed)).not.toContain('private-note')
    expect(parsed.missions[0]?.projectId).toBe('project:1')
  })

  it('rejects broken project links and unsupported review states', () => {
    expect(() => validateHermesMobileSnapshot({ ...snapshot, missions: [{ ...snapshot.missions[0], projectId: 'unknown' }] })).toThrow()
    expect(() => validateHermesMobileSnapshot({ ...snapshot, reviews: [{ ...snapshot.reviews[0], decision: 'Approuvé et publié' }] })).toThrow()
  })

  it('accepts only the generated device-token shape', () => {
    const token = createHermesMobileToken()
    expect(validateHermesMobileToken(`Bearer ${token}`)).toBe(token)
    expect(validateHermesMobileToken('Bearer short')).toBeNull()
    expect(hashHermesMobileToken(token)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashHermesMobileToken(token)).not.toBe(token)
  })
})
