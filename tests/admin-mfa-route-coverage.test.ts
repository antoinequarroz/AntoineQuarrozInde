import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('administrator MFA route coverage', () => {
  it('protects every direct administrator data branch', async () => {
    const [organizations, articles, projects, reviews, cockpit] = await Promise.all([
      readFile('server/api/admin/organizations.get.ts', 'utf8'),
      readFile('server/api/articles.get.ts', 'utf8'),
      readFile('server/api/projects.get.ts', 'utf8'),
      readFile('server/api/reviews.get.ts', 'utf8'),
      readFile('server/api/project-cockpit.get.ts', 'utf8'),
    ])

    expect(organizations).toContain('if (hasAdministrativeMembership) await requireAdminMfa(event, user)')
    expect(articles).toContain('if (!publicView) await requireAdminMfa(event, event.context.user)')
    expect(projects).toContain('if (!publicView) await requireAdminMfa(event, event.context.user)')
    expect(reviews).toContain('if (canReadHiddenReviews) await requireAdminMfa(event, event.context.user)')
    expect(cockpit).toContain('await requireAdminMfa(event, event.context.user)')
  })

  it('keeps the runtime policy public and passes it explicitly to Docker', async () => {
    const [config, compose, example] = await Promise.all([
      readFile('nuxt.config.ts', 'utf8'),
      readFile('docker-compose.yml', 'utf8'),
      readFile('.env.example', 'utf8'),
    ])

    expect(config).toContain("adminMfaMode: process.env.NUXT_PUBLIC_ADMIN_MFA_MODE || process.env.ADMIN_MFA_MODE || 'optional'")
    expect(compose).toContain('NUXT_PUBLIC_ADMIN_MFA_MODE: ${ADMIN_MFA_MODE:-optional}')
    expect(example).toContain('ADMIN_MFA_MODE=optional')
  })
})
