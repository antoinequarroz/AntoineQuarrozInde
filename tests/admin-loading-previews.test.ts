import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('admin loading previews', () => {
  it('provides accessible responsive skeleton variants', async () => {
    const component = await readFile('app/components/admin/AdminViewSkeleton.vue', 'utf8')
    expect(component).toContain("'table' | 'pipeline' | 'detail'")
    expect(component).toContain('aria-live="polite"')
    expect(component).toContain('aria-busy="true"')
    expect(component).toContain('motion-reduce:[&_*]:animate-none')
    expect(component).toContain('sm:hidden')
    expect(component).toContain('sm:block')
  })

  it('covers every core client workflow view', async () => {
    const pages = await Promise.all([
      'app/pages/admin/crm/index.vue',
      'app/pages/admin/clients/index.vue',
      'app/pages/admin/clients/[id].vue',
      'app/pages/admin/tasks/index.vue',
      'app/pages/admin/quotes/index.vue',
      'app/pages/admin/invoices/index.vue',
    ].map(path => readFile(path, 'utf8')))

    for (const page of pages) expect(page).toContain('<AdminViewSkeleton')
  })
})
