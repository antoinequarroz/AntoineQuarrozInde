import { readFileSync } from 'node:fs'
import { transpileModule, ScriptTarget, ModuleKind } from 'typescript'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../app/components/ui/BookingCalendar.vue', import.meta.url), 'utf8')
const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)![1]
const executable = transpileModule(script, {
  compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.None },
}).outputText

function setup(bookingUrl: string) {
  const instantiate = new Function(
    'useI18n', 'useRuntimeConfig', 'useMarketing', 'usePostHogEvent', 'computed', 'window',
    `${executable}; return { bookingUrl };`,
  )
  return instantiate(
    () => ({ locale: { value: 'fr' } }),
    () => ({ public: { bookingUrl } }),
    () => ({ track: vi.fn() }),
    () => ({ trackPostHog: vi.fn() }),
    (getter: () => unknown) => ({ get value() { return getter() } }),
    { dispatchEvent: vi.fn() },
  )
}

describe('Alfred booking destination', () => {
  it('accepts the public Alfred booking pages on the current and former domains', () => {
    for (const bookingUrl of ['https://alfred.postmelo.ch/rdv/diagnostic', 'https://alfred.postmelo.ch/rdv', 'https://alfred.antoinequarroz.ch/rdv/diagnostic']) {
      expect(setup(bookingUrl).bookingUrl.value).toBe(bookingUrl)
    }
  })

  it('falls back to the contact form for Cal.com, look-alike hosts and paths outside the booking page', () => {
    for (const bookingUrl of [
      '',
      'https://cal.com/antoine-quarroz-ilnim4/30min',
      'https://alfred.antoinequarroz.ch.evil.example/rdv',
      'http://alfred.antoinequarroz.ch/rdv',
      'https://alfred.antoinequarroz.ch/',
      'https://alfred.antoinequarroz.ch/rdv/../admin',
      'https://alfred.postmelo.ch.evil.example/rdv',
      'http://alfred.postmelo.ch/rdv',
      'https://alfred.postmelo.ch/rdv/../admin',
    ]) {
      expect(setup(bookingUrl).bookingUrl.value).toBe('')
    }
  })

  it('opens Alfred in a new tab and never loads a third-party booking embed', () => {
    const bookingAnchor = source.match(/<a\s+v-if="bookingUrl"([\s\S]*?)>/)![1]
    expect(bookingAnchor).toContain(':href="bookingUrl"')
    expect(bookingAnchor).toContain('target="_blank"')
    expect(bookingAnchor).toContain('rel="noopener noreferrer"')
    expect(source).not.toMatch(/cal\.com|data-cal-/i)
    expect(source).toContain("trackPostHog('booking_clicked', { provider: 'alfred' })")
  })
})
