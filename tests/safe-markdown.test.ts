import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { renderSafeMarkdown } from '../shared/utils/safeMarkdown'

describe('safe Markdown renderer', () => {
  it('renders the supported formatting subset deterministically for SSR', () => {
    const markdown = '# Titre\n\nUn texte **important** et *nuancé*.\nAvec `const answer = 42`.'
    const firstRender = renderSafeMarkdown(markdown)

    expect(firstRender).toContain('<h1 class=')
    expect(firstRender).toContain('<strong class=')
    expect(firstRender).toContain('<em>nuancé</em>')
    expect(firstRender).toContain('<code class=')
    expect(firstRender).toContain('<br>')
    expect(renderSafeMarkdown(markdown)).toBe(firstRender)
  })

  it.each([
    '<script>alert(document.cookie)</script>',
    '<img src=x onerror="alert(1)">',
    '</p><svg onload=alert(1)>',
    '&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;',
    '# <iframe srcdoc="<script>alert(1)</script>"></iframe>',
  ])('escapes raw HTML instead of adding it to the output: %s', (payload) => {
    const html = renderSafeMarkdown(payload)

    expect(html).not.toMatch(/<(?:script|img|svg|iframe)\b/i)
    expect(html).not.toMatch(/<\/p><(?:script|svg)\b/i)
    expect(html).toContain('&')
  })

  it('keeps code and Markdown markers from becoming an HTML injection path', () => {
    const html = renderSafeMarkdown('`<img src=x onerror=alert(1)>` **<script>bad()</script>**')

    expect(html).toContain('&lt;img')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script>')
  })
})

describe('CRM printable documents', () => {
  it('never sends CRM values through document.write or innerHTML', async () => {
    const [utility, invoices, quotes] = await Promise.all([
      readFile('app/utils/printStructuredDocument.ts', 'utf8'),
      readFile('app/pages/admin/invoices/index.vue', 'utf8'),
      readFile('app/pages/admin/quotes/index.vue', 'utf8'),
    ])

    expect(`${utility}\n${invoices}\n${quotes}`).not.toMatch(/document\.write|\.innerHTML\s*=/)
    expect(utility).toContain('description.textContent = field.value')
    expect(utility).toContain('heading.textContent = options.heading')
    expect(invoices).toContain('printStructuredDocument({')
    expect(quotes).toContain('printStructuredDocument({')
  })
})
