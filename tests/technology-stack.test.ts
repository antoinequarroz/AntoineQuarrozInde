import { describe, expect, it } from 'vitest'
import {
  cloneDefaultTechnologyStack,
  parseTechnologyStackItems,
  technologyStackOrDefault,
} from '../shared/utils/technologyStack'

describe('technology stack contract', () => {
  it('keeps the initial public catalog deterministic and honest', () => {
    const items = cloneDefaultTechnologyStack()
    expect(items).toHaveLength(20)
    expect(items.map(item => item.position)).toEqual(items.map((_, index) => index))
    expect(items.every(item => item.level === 'used')).toBe(true)
    expect(items.filter(item => item.showFooter).map(item => item.label)).toEqual([
      'Vue 3', 'Nuxt', 'React', 'Next.js', 'SwiftUI', 'Flutter', 'Dart', 'Rust', 'Supabase',
    ])
  })

  it('normalizes labels and sorts a valid list', () => {
    expect(parseTechnologyStackItems([
      { key: 'nuxt', label: ' Nuxt ', icon: 'nuxt', level: 'daily', showAbout: true, showFooter: true, position: 1 },
      { key: 'vue', label: 'Vue 3', icon: 'vue', level: 'mastered', showAbout: true, showFooter: false, position: 0 },
    ])).toEqual([
      { key: 'vue', label: 'Vue 3', icon: 'vue', level: 'mastered', showAbout: true, showFooter: false, position: 0 },
      { key: 'nuxt', label: 'Nuxt', icon: 'nuxt', level: 'daily', showAbout: true, showFooter: true, position: 1 },
    ])
  })

  it.each([
    [[{ key: 'vue', label: 'Vue', icon: 'remote-svg', level: 'used', showAbout: true, showFooter: false, position: 0 }]],
    [[{ key: 'vue', label: '<b>Vue</b>', icon: 'vue', level: 'used', showAbout: true, showFooter: false, position: 0 }]],
    [[{ key: 'vue', label: 'Vue', icon: 'vue', level: 'expert', showAbout: true, showFooter: false, position: 0 }]],
    [[
      { key: 'vue', label: 'Vue', icon: 'vue', level: 'used', showAbout: true, showFooter: false, position: 0 },
      { key: 'vue', label: 'Vue bis', icon: 'vue', level: 'used', showAbout: true, showFooter: false, position: 1 },
    ]],
    [[
      { key: 'vue', label: 'Vue', icon: 'vue', level: 'used', showAbout: true, showFooter: false, position: 0 },
      { key: 'nuxt', label: 'Nuxt', icon: 'nuxt', level: 'used', showAbout: true, showFooter: false, position: 0 },
    ]],
  ])('rejects an unsafe or ambiguous document', (items) => {
    expect(() => parseTechnologyStackItems(items)).toThrow()
  })

  it('falls back to a fresh copy of the initial catalog', () => {
    const fallback = technologyStackOrDefault(null)
    fallback[0]!.label = 'Changed'
    expect(technologyStackOrDefault(null)[0]?.label).toBe('Vue 3')
  })
})
