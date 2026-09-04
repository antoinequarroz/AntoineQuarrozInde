import { readFile } from 'node:fs/promises'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import {
  caseStudyPublicationBlockers,
  PROJECT_CASE_STUDY_SERVICES,
} from '../shared/utils/projectCaseStudyApproval'
import { serializePublicProject } from '../server/utils/publicContent'

beforeAll(() => {
  vi.stubGlobal('createError', (input: { statusCode: number, message: string }) => Object.assign(new Error(input.message), input))
})

const approvedCase = {
  id: 12,
  title: 'Projet approuvé',
  slug: 'projet-approuve',
  category: 'web',
  tags: ['Nuxt'],
  description: 'Description publique.',
  description_en: null,
  description_de: null,
  image: '/cover.webp',
  live_url: 'https://example.com',
  code_url: 'https://github.com/example/project',
  featured: false,
  portfolio_visible: false,
  case_study_published: true,
  case_study_published_at: '2026-09-04T10:00:00Z',
  case_study_approved_at: '2026-09-04T10:00:00Z',
  client_label: 'Client public',
  client_disclosure_status: 'approved',
  project_role: 'Conception et développement',
  project_duration: 'Six semaines',
  case_study_timeline_approved: true,
  completed_at: '2026-08-01',
  challenge: 'Contexte autonome.',
  project_scope: 'Périmètre autonome.',
  key_decisions: 'Décisions autonomes.',
  approach: null,
  solution: null,
  outcome: 'Résultat qualitatif observé.',
  outcome_approved: true,
  case_study_links_approved: true,
  related_service_paths: ['/creation-site-internet-valais'],
  deliverables: [],
  gallery_images: [],
  results: [
    {
      value: '1,2 s',
      label: 'Chargement mesuré',
      measurementContext: 'Mesure après mise en ligne',
      evidenceNote: 'Rapport privé interne',
      approved: true,
    },
    {
      value: '+20 %',
      label: 'Mesure non approuvée',
      measurementContext: null,
      evidenceNote: 'À vérifier',
      approved: false,
    },
  ],
  seo_title: null,
  seo_description: null,
  updated_at: '2026-09-04T10:00:00Z',
  created_at: '2026-09-01T10:00:00Z',
}

describe('AQ-SEO-012 approved case studies', () => {
  it('requires only the five critical passages, disclosure, outcome approval and a human-selected service', () => {
    expect(caseStudyPublicationBlockers({})).toEqual(expect.arrayContaining([
      { field: 'challenge', label: 'Contexte' },
      { field: 'projectRole', label: 'Rôle d’Antoine' },
      { field: 'projectScope', label: 'Périmètre' },
      { field: 'keyDecisions', label: 'Décisions' },
      { field: 'outcome', label: 'Résultat qualitatif' },
      { field: 'outcomeApproved', label: 'Approbation du résultat qualitatif' },
      { field: 'clientDisclosureStatus', label: 'Décision de confidentialité' },
      { field: 'relatedServicePaths', label: 'Au moins un service pertinent' },
    ]))

    expect(caseStudyPublicationBlockers({
      challenge: 'Contexte',
      projectRole: 'Rôle',
      projectScope: 'Périmètre',
      keyDecisions: 'Décisions',
      outcome: 'Résultat',
      outcomeApproved: true,
      clientDisclosureStatus: 'anonymous',
      relatedServicePaths: ['/creation-site-internet-valais'],
    })).toEqual([])
  })

  it('requires a client label only when named attribution is approved', () => {
    const base = {
      challenge: 'Contexte',
      projectRole: 'Rôle',
      projectScope: 'Périmètre',
      keyDecisions: 'Décisions',
      outcome: 'Résultat',
      outcomeApproved: true,
      relatedServicePaths: ['/creation-site-internet-valais'],
    }
    expect(caseStudyPublicationBlockers({ ...base, clientDisclosureStatus: 'approved' }))
      .toContainEqual({ field: 'clientLabel', label: 'Nom client approuvé' })
    expect(caseStudyPublicationBlockers({ ...base, clientDisclosureStatus: 'anonymous' }))
      .not.toContainEqual(expect.objectContaining({ field: 'clientLabel' }))
  })

  it('normalizes the closed approval contract without truncating malformed measures', async () => {
    const { projectPayload } = await import('../server/utils/projectPayload')
    const base = {
      title: 'Projet',
      slug: 'projet',
      category: 'web',
      description: 'Description',
      image: 'https://example.com/image.webp',
      liveUrl: 'https://example.com',
      clientDisclosureStatus: 'anonymous',
      relatedServicePaths: ['/developpeur-web-valais'],
      results: [{
        value: '1,2 s',
        label: 'Chargement',
        measurementContext: 'Après livraison',
        evidenceNote: 'Rapport privé',
        approved: true,
      }],
    }
    const payload = projectPayload(base, 'org-test')

    expect(payload.client_disclosure_status).toBe('anonymous')
    expect(payload.related_service_paths).toEqual(['/developpeur-web-valais'])
    expect(payload.results).toEqual([{
      value: '1,2 s',
      label: 'Chargement',
      measurementContext: 'Après livraison',
      evidenceNote: 'Rapport privé',
      approved: true,
    }])
    expect(() => projectPayload({ ...base, clientDisclosureStatus: 'public' }, 'org-test')).toThrow('Invalid client disclosure status')
    expect(() => projectPayload({ ...base, relatedServicePaths: ['/service-invente'] }, 'org-test')).toThrow('Invalid related case-study service')
    expect(() => projectPayload({ ...base, relatedServicePaths: ['/developpeur-web-valais', '/developpeur-web-valais'] }, 'org-test')).toThrow('Invalid related case-study service')
    expect(() => projectPayload({ ...base, results: [{ value: '', label: 'Incomplet' }] }, 'org-test')).toThrow('result 1 value is required')
  })

  it('keeps an unapproved study private while preserving an independently visible portfolio card', () => {
    const privateStudy = serializePublicProject({ ...approvedCase, case_study_approved_at: null })
    expect(privateStudy).toMatchObject({
      case_study_published: false,
      client_label: null,
      challenge: null,
      project_scope: null,
      key_decisions: null,
      outcome: null,
      results: [],
      related_service_paths: [],
    })

    const portfolio = serializePublicProject({
      ...approvedCase,
      portfolio_visible: true,
      case_study_approved_at: null,
    })
    expect(portfolio.portfolio_visible).toBe(true)
    expect(portfolio.live_url).toBe('https://example.com')
    expect(portfolio.case_study_published).toBe(false)
  })

  it('filters every sensitive field through its explicit approval and never returns private evidence', () => {
    const publicCase = serializePublicProject(approvedCase)
    expect(publicCase).toMatchObject({
      case_study_published: true,
      client_label: 'Client public',
      project_duration: 'Six semaines',
      completed_at: '2026-08-01',
      project_scope: 'Périmètre autonome.',
      key_decisions: 'Décisions autonomes.',
      related_service_paths: ['/creation-site-internet-valais'],
      results: [{
        value: '1,2 s',
        label: 'Chargement mesuré',
        measurementContext: 'Mesure après mise en ligne',
      }],
    })
    expect(JSON.stringify(publicCase)).not.toContain('Rapport privé')
    expect(JSON.stringify(publicCase)).not.toContain('À vérifier')
    expect(JSON.stringify(publicCase)).not.toContain('approved_by')

    const anonymous = serializePublicProject({ ...approvedCase, client_disclosure_status: 'anonymous' })
    expect(anonymous.client_label).toBeNull()
    const optionalPrivate = serializePublicProject({
      ...approvedCase,
      case_study_links_approved: false,
      case_study_timeline_approved: false,
    })
    expect(optionalPrivate).toMatchObject({
      live_url: null,
      code_url: null,
      case_study_live_url: null,
      case_study_code_url: null,
      project_duration: null,
      completed_at: null,
    })
  })

  it('keeps service paths closed and renders the five SSR passages plus service links', async () => {
    expect(PROJECT_CASE_STUDY_SERVICES.map(service => service.path)).toEqual([
      '/developpeur-web-valais',
      '/creation-site-internet-valais',
      '/refonte-site-web-valais',
      '/application-mobile-valais',
    ])

    const [page, hub] = await Promise.all([
      readFile('app/pages/projets/[slug].vue', 'utf8'),
      readFile('app/pages/cas-clients-valais.vue', 'utf8'),
    ])
    for (const [key, heading] of [
      ['context', 'Contexte'],
      ['role', 'Rôle d’Antoine'],
      ['scope', 'Périmètre'],
      ['decisions', 'Décisions'],
      ['results', 'Résultats'],
    ]) {
      expect(page).toContain(`{ key: '${key}', title: '${heading}'`)
    }
    expect(page).toContain('data-case-study-services')
    expect(page).toContain('project.caseStudyLiveUrl')
    expect(hub).toContain('data-case-study-card-services')
    expect(hub).not.toContain("'@type': 'FAQPage'")
    expect(hub).not.toContain('transformer le trafic en demandes qualifiées')
    expect(hub).not.toContain('quelques semaines')
  })

  it('uses an additive migration and a fail-closed public discovery gate', async () => {
    const [migration, schema, api, sitemap] = await Promise.all([
      readFile('supabase/migrations/20260904205717_add_project_case_study_approvals.sql', 'utf8'),
      readFile('supabase/schema.sql', 'utf8'),
      readFile('server/api/projects.get.ts', 'utf8'),
      readFile('server/routes/sitemap.xml.ts', 'utf8'),
    ])
    for (const column of [
      'project_scope',
      'key_decisions',
      'client_disclosure_status',
      'case_study_links_approved',
      'case_study_timeline_approved',
      'outcome_approved',
      'related_service_paths',
      'case_study_approved_at',
      'case_study_approved_by',
    ]) {
      expect(migration).toContain(`add column if not exists ${column}`)
      expect(schema).toContain(column)
    }
    expect(migration).not.toMatch(/drop\s+(table|column)/i)
    expect(migration).toContain('security invoker')
    expect(migration).toContain('for update')
    expect(migration).toContain('project.case_study_sensitive_changed')
    expect(api).toContain('case_study_approved_at.not.is.null')
    expect(sitemap).toContain(".not('case_study_approved_at', 'is', null)")
  })
})
