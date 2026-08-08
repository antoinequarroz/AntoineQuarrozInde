import { describe, expect, it } from 'vitest'
import { isPlausiblePublicPath } from '../app/utils/plausible'

describe('Plausible public analytics scope', () => {
  it('tracks public marketing and content pages', () => {
    expect(isPlausiblePublicPath('/')).toBe(true)
    expect(isPlausiblePublicPath('/projets/une-etude')).toBe(true)
    expect(isPlausiblePublicPath('/blog/article')).toBe(true)
  })

  it('does not track private admin or client routes', () => {
    expect(isPlausiblePublicPath('/admin')).toBe(false)
    expect(isPlausiblePublicPath('/admin/invoices')).toBe(false)
    expect(isPlausiblePublicPath('/portal')).toBe(false)
    expect(isPlausiblePublicPath('/portal/login')).toBe(false)
  })
})
