import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

import {
  PUBLIC_SERVICE_DECISION_SECTION_KEYS,
  resolvePublicServiceDecisionContent,
  type PublicServiceDecisionContentInput,
} from '../shared/utils/publicServiceContent'

const servicePages = [
  'app/pages/developpeur-web-valais.vue',
  'app/pages/creation-site-internet-valais.vue',
  'app/pages/refonte-site-web-valais.vue',
  'app/pages/application-mobile-valais.vue',
]
const servicePaths = servicePages.map(path => path.replace(/^app\/pages|\.vue$/g, ''))
const execFileAsync = promisify(execFile)
const proofServers: Array<ReturnType<typeof createServer>> = []
const unixIt = process.platform === 'win32' ? it.skip : it

type DecisionProofVariant =
  | 'valid'
  | 'missing-page'
  | 'missing-introduction'
  | 'missing-introduction-marker'
  | 'missing-section'
  | 'wrong-order'
  | 'missing-proof'
  | 'external-proof'
  | 'missing-contact'
  | 'precision'
  | 'guarantee'
  | 'corrupted-copy'
  | 'redirect'
  | 'oversized'

afterEach(async () => {
  await Promise.all(proofServers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
  })))
})

function proofPage(variant: DecisionProofVariant) {
  const introduction = variant === 'missing-introduction'
    ? ''
    : `<p data-service-introduction data-service-offer data-service-audience ${variant === 'missing-introduction-marker' ? '' : 'data-service-area'}>J’accompagne les PME du Valais avec un service adapté à leur besoin.</p>`
  const deliverables = '<section data-service-section="deliverables"><h2>Quels livrables sont inclus ?</h2><ul><li><span data-service-deliverable>Un cadrage clair.</span></li><li><span data-service-deliverable>Une réalisation vérifiée.</span></li></ul></section>'
  const process = '<section data-service-section="process"><h2>Comment se déroule le projet ?</h2><ol><li><span data-service-process-step>Le besoin est clarifié.</span></li><li><span data-service-process-step>La réalisation est vérifiée.</span></li></ol></section>'
  const timelineText = variant === 'precision'
    ? 'La livraison intervient en 6 semaines.'
    : variant === 'corrupted-copy'
      ? 'Le dÃ©lai dépend du périmètre.'
      : 'Le planning est confirmé après le cadrage et dépend du périmètre.'
  const timeline = `<section data-service-section="timeline"><h2>Quels délais prévoir ?</h2><p data-service-timeline>${timelineText}</p></section>`
  const limitText = variant === 'guarantee'
    ? 'Un résultat commercial est garanti.'
    : 'Les résultats commerciaux restent variables.'
  const limits = `<section data-service-section="limits"><h2>Quelles sont les limites ?</h2><ul><li><span data-service-limit>${limitText}</span></li></ul></section>`
  const proofLink = variant === 'missing-proof'
    ? ''
    : `<a data-service-proof-link href="${variant === 'external-proof' ? 'https://evil.test/proof' : '/#portfolio'}">Voir les réalisations publiées</a>`
  const contactLink = variant === 'missing-contact'
    ? ''
    : '<a data-service-contact-link href="/#contact">Présenter mon besoin</a>'
  const nextStep = `<section data-service-section="next-step"><h2>Quelle est la prochaine étape ?</h2><p data-service-next-step>Présentez le contexte pour définir un périmètre adapté.</p><p data-service-proof-note>Le portfolio montre uniquement les réalisations publiées.</p>${proofLink}${contactLink}</section>`
  let sections = [deliverables, process, timeline, limits, nextStep]
  if (variant === 'missing-section') sections = sections.filter(section => !section.includes('data-service-section="timeline"'))
  if (variant === 'wrong-order') sections = [process, deliverables, timeline, limits, nextStep]
  return `<!doctype html><html><body><main><h1>Service en Valais</h1>${introduction}<div data-service-decision-content>${sections.join('')}</div></main></body></html>`
}

async function startDecisionProofServer(variant: DecisionProofVariant) {
  const server = createServer((request, response) => {
    const address = server.address() as { port: number }
    const origin = `http://127.0.0.1:${address.port}`
    const publishedPaths = variant === 'missing-page' ? servicePaths.slice(0, -1) : servicePaths

    if (request.url === '/sitemap.xml') {
      response.setHeader('content-type', 'application/xml')
      response.end(`<urlset>${publishedPaths.map(path => `<url><loc>${origin}${path}</loc></url>`).join('')}</urlset>`)
      return
    }
    if (!request.url || !publishedPaths.includes(request.url)) {
      response.statusCode = 404
      response.end()
      return
    }
    if (variant === 'redirect' && request.url === servicePaths[0]) {
      response.statusCode = 302
      response.setHeader('location', '/')
      response.end()
      return
    }
    if (variant === 'oversized' && request.url === servicePaths[0]) {
      response.statusCode = 200
      response.setHeader('content-type', 'text/html')
      response.setHeader('content-length', '5000000')
      response.end('too large')
      return
    }

    response.setHeader('content-type', 'text/html; charset=UTF-8')
    response.end(proofPage(variant))
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  proofServers.push(server)
  const address = server.address() as { port: number }
  return `http://127.0.0.1:${address.port}`
}

function runDecisionProof(origin: string) {
  return execFileAsync('bash', ['scripts/ops/verify-service-decision-content.sh', origin], { cwd: process.cwd() })
}

function validContent(
  override: Partial<PublicServiceDecisionContentInput> = {},
): PublicServiceDecisionContentInput {
  return {
    introduction: 'J’accompagne les PME du Valais avec un service web adapté à leur besoin.',
    deliverables: ['Un cadrage clair.', 'Une réalisation vérifiée.'],
    process: ['Le besoin est clarifié.', 'Le résultat est vérifié avant la mise en ligne.'],
    timeline: 'Le planning est confirmé après le cadrage et dépend du périmètre.',
    limits: ['Aucun résultat commercial ou classement SEO n’est garanti.'],
    nextStep: 'Présentez le contexte pour définir un périmètre adapté.',
    proofNote: 'Le portfolio présente uniquement les réalisations actuellement publiées.',
    proof: { label: 'Voir les réalisations publiées', path: '/#portfolio' },
    contact: { label: 'Présenter mon besoin', path: '/#contact' },
    ...override,
  }
}

describe('AQ-SEO-011 service decision content', () => {
  it('resolves a complete immutable qualitative content contract', () => {
    const content = resolvePublicServiceDecisionContent(validContent())

    expect(PUBLIC_SERVICE_DECISION_SECTION_KEYS).toEqual([
      'deliverables',
      'process',
      'timeline',
      'limits',
      'next-step',
    ])
    expect(content.proof).toEqual({ label: 'Voir les réalisations publiées', path: '/#portfolio' })
    expect(content.contact).toEqual({ label: 'Présenter mon besoin', path: '/#contact' })
    expect(Object.isFrozen(content)).toBe(true)
    expect(Object.isFrozen(content.deliverables)).toBe(true)
    expect(Object.isFrozen(content.process)).toBe(true)
    expect(Object.isFrozen(content.limits)).toBe(true)
    expect(Object.isFrozen(content.proof)).toBe(true)
    expect(Object.isFrozen(content.contact)).toBe(true)
  })

  it.each([
    ['introduction', { introduction: '' }],
    ['deliverables', { deliverables: [] }],
    ['process', { process: [' Étape avec espace initial.'] }],
    ['timeline', { timeline: ' ' }],
    ['limits', { limits: [] }],
    ['next step', { nextStep: '' }],
    ['proof note', { proofNote: '' }],
    ['proof label', { proof: { label: '', path: '/#portfolio' } }],
    ['contact label', { contact: { label: '', path: '/#contact' } }],
  ])('rejects incomplete %s content', (_label, override) => {
    expect(() => resolvePublicServiceDecisionContent(validContent(override)))
      .toThrow(/public_service_decision_/)
  })

  it('rejects duplicate decision list items', () => {
    expect(() => resolvePublicServiceDecisionContent(validContent({
      deliverables: ['Une livraison.', 'Une livraison.'],
    }))).toThrow('public_service_decision_deliverables_invalid_duplicate')
  })

  it.each([
    'https://example.com/#portfolio',
    '//example.com/#portfolio',
    'portfolio',
    '/autre#portfolio',
    '/#portfolio?source=test',
    '/a/../#portfolio',
    '/#portfolio\\evil',
  ])('rejects an unapproved proof destination: %s', (path) => {
    expect(() => resolvePublicServiceDecisionContent(validContent({
      proof: { label: 'Voir les réalisations publiées', path },
    }))).toThrow('public_service_decision_proof_path_invalid')
  })

  it('rejects a contact destination outside the approved contact anchor', () => {
    expect(() => resolvePublicServiceDecisionContent(validContent({
      contact: { label: 'Présenter mon besoin', path: '/contact' },
    }))).toThrow('public_service_decision_contact_path_invalid')
  })

  it.each([
    'Livraison en 6 semaines.',
    'Budget de CHF mille.',
    'Progression de 20%.',
    'Prix de 900 €.',
    'Budget en dollars $.',
  ])('rejects unapproved commercial precision: %s', (timeline) => {
    expect(() => resolvePublicServiceDecisionContent(validContent({ timeline })))
      .toThrow('public_service_decision_precision_unapproved')
  })

  it.each([
    'DÃ©veloppement adapté.',
    'Texte avec caractère � corrompu.',
    'DÃ©lai confirmé après cadrage.',
  ])('rejects corrupted public copy: %s', (timeline) => {
    expect(() => resolvePublicServiceDecisionContent(validContent({ timeline })))
      .toThrow('public_service_decision_text_corrupted')
  })

  it('renders native semantic content without raw HTML or client-only disclosure', async () => {
    const component = await readFile('app/components/ui/ServiceDecisionContent.vue', 'utf8')

    expect(component).toContain('data-service-decision-content')
    expect(component.match(/data-service-section=/g)).toHaveLength(5)
    expect(component).toContain('<section')
    expect(component).toContain('<h2')
    expect(component).toContain('<ul')
    expect(component).toContain('<ol')
    expect(component).toContain('<NuxtLink')
    expect(component).toContain('focus-visible:ring-2')
    expect(component).toContain('min-h-11')
    expect(component).toContain('{{ deliverable }}')
    expect(component).not.toContain('v-html')
    expect(component).not.toContain('<details')
    expect(component).not.toContain('@click')
  })

  it('wires every service page to an approved complete decision model', async () => {
    const pages = await Promise.all(servicePages.map(path => readFile(path, 'utf8')))

    for (const page of pages) {
      expect(page).toContain('resolvePublicServiceDecisionContent')
      expect(page).toContain('description: decisionContent.introduction')
      expect(page).toContain('data-service-introduction')
      expect(page).toContain('<UiServiceDecisionContent :content="decisionContent" />')
      expect(page).toContain('Valais')
      expect(page).toContain("path: '/#portfolio'")
      expect(page).toContain("path: '/#contact'")
      expect(page).not.toContain("name: 'Developpeur web en Valais'")
      expect(page).not.toContain('Developpement Application Mobile Valais')
      expect(page).not.toContain('Amelioration UX')
      expect(page).not.toContain('orientée resultat')
      expect(page).not.toContain('Flux ecrans')
    }
  })

  it('keeps the production proof, no-JavaScript journey and rollback runbook wired', async () => {
    const [workflow, e2e, operations] = await Promise.all([
      readFile('.github/workflows/ci.yml', 'utf8'),
      readFile('e2e/public.spec.ts', 'utf8'),
      readFile('docs/operations.md', 'utf8'),
    ])

    const breadcrumbProof = 'bash scripts/ops/verify-service-breadcrumbs.sh https://www.antoinequarroz.ch'
    const decisionProof = 'bash scripts/ops/verify-service-decision-content.sh https://www.antoinequarroz.ch'
    expect(workflow).toContain(breadcrumbProof)
    expect(workflow).toContain(decisionProof)
    expect(workflow.indexOf(decisionProof)).toBeGreaterThan(workflow.indexOf(breadcrumbProof))
    expect(e2e).toContain('service pages answer decision questions and expose proof and contact without JavaScript')
    expect(e2e).toContain("javaScriptEnabled: false")
    expect(e2e).toContain("toHaveAttribute('href', '/#portfolio')")
    expect(e2e).toContain("toHaveAttribute('href', '/#contact')")
    expect(operations).toContain('verify-service-decision-content.sh')
    expect(operations).toContain('image `previous`')
  })

  unixIt('accepts complete SSR decision content on all four service pages', async () => {
    const origin = await startDecisionProofServer('valid')
    const result = await runDecisionProof(origin)

    expect(result.stdout).toContain('Service decision content is valid on 4 service page(s)')
  })

  unixIt.each([
    'missing-page',
    'missing-introduction',
    'missing-introduction-marker',
    'missing-section',
    'wrong-order',
    'missing-proof',
    'external-proof',
    'missing-contact',
    'precision',
    'guarantee',
    'corrupted-copy',
    'redirect',
    'oversized',
  ] as const)('fails closed for the %s proof variant', async (variant) => {
    const origin = await startDecisionProofServer(variant)

    await expect(runDecisionProof(origin)).rejects.toMatchObject({ code: 1 })
  })

  unixIt.each([
    'https://user@example.com',
    'https://example.com/path',
    'https://example.com?preview=1',
    'file:///tmp/site',
  ])('rejects an unsafe proof origin: %s', async (origin) => {
    await expect(runDecisionProof(origin)).rejects.toMatchObject({ code: 64 })
  })
})
