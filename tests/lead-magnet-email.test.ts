import { describe, expect, it } from 'vitest'
import { buildLeadMagnetEmail } from '../server/utils/leadMagnetEmail'

describe('lead magnet delivery email', () => {
  const input = {
    email: 'reader@example.com',
    slug: 'checklist-ia-pme' as const,
    downloadUrl: '/api/ressources/checklist-ia-pme?token=signed-token',
  }

  it('delivers an absolute secure link and explains newsletter confirmation', () => {
    const message = buildLeadMagnetEmail(input, 'https://www.antoinequarroz.ch/')

    expect(message.subject).toContain('checklist')
    expect(message.text).toContain('https://www.antoinequarroz.ch/api/ressources/checklist-ia-pme?token=signed-token')
    expect(message.text).toContain('confirmation de votre inscription')
    expect(message.html).toContain('Télécharger la checklist PDF')
    expect(message.html).toContain('PME · IA · Outils métier')
  })

  it('creates a different idempotency key for a newly signed link', () => {
    const first = buildLeadMagnetEmail(input, 'https://www.antoinequarroz.ch')
    const second = buildLeadMagnetEmail({ ...input, downloadUrl: `${input.downloadUrl}-new` }, 'https://www.antoinequarroz.ch')

    expect(first.idempotencyKey).not.toBe(second.idempotencyKey)
  })
})
