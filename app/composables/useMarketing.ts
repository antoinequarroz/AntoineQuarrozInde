type HeroVariant = 'A' | 'B'

import { classifyAcquisition } from '~~/shared/utils/acquisitionChannel'

export function useMarketing() {
  const variant = useState<HeroVariant>('hero-variant', () => 'A')

  function initVariant() {
    if (!import.meta.client) return
    const saved = localStorage.getItem('hero_variant')
    if (saved === 'A' || saved === 'B') {
      variant.value = saved
      return
    }
    const chosen: HeroVariant = Math.random() < 0.5 ? 'A' : 'B'
    variant.value = chosen
    localStorage.setItem('hero_variant', chosen)
  }

  async function track(event: string, metadata: Record<string, any> = {}) {
    try {
      const attribution = captureLeadAttribution()
      await $fetch('/api/marketing-event', {
        method: 'POST',
        body: {
          event,
          variant: variant.value,
          path: import.meta.client ? window.location.pathname : '/',
          metadata: {
            ...metadata,
            acquisitionChannel: classifyAcquisition({
              utmSource: attribution.utmSource,
              referrerHost: attribution.referrerHost,
            }),
          },
        },
      })
    } catch {}
  }

  return { variant, initVariant, track }
}
