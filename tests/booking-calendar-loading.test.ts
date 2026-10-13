import { readFileSync } from 'node:fs'
import { transpileModule, ScriptTarget, ModuleKind } from 'typescript'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../app/components/ui/BookingCalendar.vue', import.meta.url), 'utf8')
const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)![1]
const executable = transpileModule(script, {
  compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.None },
}).outputText

function setup({ observerAvailable = true, bookingUrl = 'https://cal.com/antoine/diagnostic' } = {}) {
  const mounted: (() => void)[] = []
  const unmounted: (() => void)[] = []
  const appended: { src: string, async: boolean }[] = []
  const observe = vi.fn()
  const disconnect = vi.fn()
  const trackPostHog = vi.fn()
  const addEventListener = vi.fn()
  const removeEventListener = vi.fn()
  const windowMock: Record<string, unknown> = { addEventListener, removeEventListener }
  let observedCallback: (entries: { isIntersecting: boolean }[]) => void = () => {}
  let observerOptions: IntersectionObserverInit | undefined

  class Observer {
    observe = observe
    disconnect = disconnect
    constructor(callback: typeof observedCallback, options: IntersectionObserverInit) {
      observedCallback = callback
      observerOptions = options
    }
  }

  const instantiate = new Function(
    'useI18n', 'useRuntimeConfig', 'useMarketing', 'usePostHogEvent',
    'ref', 'computed', 'onMounted', 'onBeforeUnmount', 'window', 'document', 'IntersectionObserver',
    `${executable}; return { bookingCard, prepareCalEmbed, captureConfirmedBooking };`,
  )
  const component = instantiate(
    () => ({ locale: { value: 'fr' } }),
    () => ({ public: { bookingUrl } }),
    () => ({ track: vi.fn() }),
    () => ({ trackPostHog }),
    (value: unknown) => ({ value }),
    (getter: () => unknown) => ({ get value() { return getter() } }),
    (callback: () => void) => mounted.push(callback),
    (callback: () => void) => unmounted.push(callback),
    windowMock,
    { createElement: () => ({ src: '', async: false }), head: { appendChild: (element: { src: string, async: boolean }) => appended.push(element) } },
    observerAvailable ? Observer : undefined,
  )
  const element = { id: 'booking-card' }
  component.bookingCard.value = element
  mounted.forEach(callback => callback())

  return {
    component, appended, windowMock, observe, disconnect, trackPostHog, addEventListener, removeEventListener,
    element, options: () => observerOptions,
    intersect: (isIntersecting: boolean) => observedCallback([{ isIntersecting }]),
    unmount: () => unmounted.forEach(callback => callback()),
  }
}

describe('Cal.com embed loading', () => {
  it('keeps the calendar script out of a distant card until it approaches the viewport', () => {
    const runtime = setup()
    expect(runtime.appended).toEqual([])
    expect(runtime.windowMock.Cal).toBeUndefined()
    expect(runtime.observe).toHaveBeenCalledWith(runtime.element)
    expect(runtime.options()).toEqual({ rootMargin: '400px 0px' })
    runtime.intersect(false)
    expect(runtime.appended).toEqual([])
    runtime.intersect(true)
    expect(runtime.appended).toEqual([{ src: 'https://app.cal.com/embed/embed.js', async: true }])
  })

  it('initializes its namespace and UI only once across viewport and intent triggers', () => {
    const runtime = setup()
    runtime.component.prepareCalEmbed()
    runtime.intersect(true)
    runtime.component.prepareCalEmbed()
    expect(runtime.appended).toHaveLength(1)
    expect(runtime.disconnect).toHaveBeenCalledTimes(1)
    const cal = runtime.windowMock.Cal as { q: unknown[], ns: Record<string, { q: unknown[] }> }
    expect(cal.q).toEqual([['initNamespace', 'portfolio-contact']])
    expect(cal.ns['portfolio-contact'].q).toEqual([
      ['init', 'portfolio-contact', { origin: 'https://cal.com' }],
      ['ui', { hideEventTypeDetails: false, layout: 'month_view' }],
    ])
  })

  it('supports first intent without IntersectionObserver and does not load on mount', () => {
    const runtime = setup({ observerAvailable: false })
    expect(runtime.appended).toEqual([])
    expect(runtime.observe).not.toHaveBeenCalled()
    runtime.component.prepareCalEmbed()
    expect(runtime.appended).toHaveLength(1)
    expect(source).toContain('@pointerenter="prepareCalEmbed"')
    expect(source).toContain('@focusin="prepareCalEmbed"')
  })

  it('does not load an embed for a missing or invalid booking destination', () => {
    for (const bookingUrl of ['', 'https://example.com/diagnostic']) {
      const runtime = setup({ bookingUrl })
      runtime.component.prepareCalEmbed()
      runtime.intersect(true)
      expect(runtime.appended).toEqual([])
      expect(runtime.observe).not.toHaveBeenCalled()
    }
  })

  it('disconnects observation and removes the booking message listener when unmounted', () => {
    const runtime = setup()
    runtime.unmount()
    expect(runtime.disconnect).toHaveBeenCalledTimes(1)
    expect(runtime.removeEventListener).toHaveBeenCalledWith('message', runtime.component.captureConfirmedBooking)
  })

  it('retains a native external link when the remote embed is unavailable', () => {
    const bookingAnchor = source.match(/<a\s+v-if="bookingUrl"([\s\S]*?)>/)![1]
    expect(bookingAnchor).toContain(':href="bookingUrl"')
    expect(bookingAnchor).toContain('target="_blank"')
    expect(bookingAnchor).toContain('rel="noopener noreferrer"')
    expect(bookingAnchor).not.toContain('prevent')
  })

  it('still records one confirmed booking only from trusted Cal.com messages', () => {
    const runtime = setup()
    const data = { type: 'bookingSuccessfulV2', originator: 'Cal.com' }
    runtime.component.captureConfirmedBooking({ origin: 'https://example.com', data })
    runtime.component.captureConfirmedBooking({ origin: 'https://cal.com', data: { ...data, type: 'bookingStarted' } })
    expect(runtime.trackPostHog).not.toHaveBeenCalled()
    runtime.component.captureConfirmedBooking({ origin: 'https://app.cal.com', data })
    runtime.component.captureConfirmedBooking({ origin: 'https://cal.com', data })
    expect(runtime.trackPostHog).toHaveBeenCalledExactlyOnceWith('booking_confirmed', { provider: 'cal.com' })
  })
})
