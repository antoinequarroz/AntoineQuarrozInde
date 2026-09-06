import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('public write endpoint body ceilings', () => {
  it.each([
    ['server/api/contact.post.ts', 'MAX_CONTACT_REQUEST_BYTES'],
    ['server/api/client-error.post.ts', 'MAX_ERROR_REPORT_REQUEST_BYTES'],
    ['server/api/marketing-event.post.ts', 'MAX_MARKETING_EVENT_REQUEST_BYTES'],
  ])('%s uses the bounded JSON reader', async (path, limitName) => {
    const source = await readFile(path, 'utf8')
    expect(source).toContain(`readJsonBodyLimited(event, ${limitName})`)
    expect(source).not.toMatch(/\breadBody\s*[<(]/)
    expect(source.indexOf('.isAllowed(ip')).toBeLessThan(source.indexOf('readJsonBodyLimited(event'))
  })
})
