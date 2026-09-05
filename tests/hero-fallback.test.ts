import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { decideSplineLoading } from '../app/utils/splineLoading'

describe('AQ-SEO-013 hero fallback', () => {
  it('loads only when motion, network and WebGL allow it', () => {
    expect(decideSplineLoading({ reducedMotion: false, webglSupported: true })).toEqual({ load: true })
    expect(decideSplineLoading({ reducedMotion: true, webglSupported: true })).toEqual({ load: false, reason: 'motion' })
    expect(decideSplineLoading({ reducedMotion: false, smallViewport: true, webglSupported: true })).toEqual({ load: false, reason: 'mobile' })
    expect(decideSplineLoading({ reducedMotion: false, saveData: true, webglSupported: true })).toEqual({ load: false, reason: 'network' })
    expect(decideSplineLoading({ reducedMotion: false, effectiveType: 'slow-2g', webglSupported: true })).toEqual({ load: false, reason: 'network' })
    expect(decideSplineLoading({ reducedMotion: false, effectiveType: '4g', webglSupported: false })).toEqual({ load: false, reason: 'unsupported' })
  })

  it('keeps critical copy and native CTAs outside the decorative viewer', async () => {
    const [hero, robot] = await Promise.all([
      readFile('app/components/sections/HeroSplineSection.vue', 'utf8'),
      readFile('app/components/ui/SplineRobot.vue', 'utf8'),
    ])
    expect(hero).toContain('data-hero-critical-content')
    expect(hero).toContain('data-hero-primary-cta')
    expect(hero).toContain('data-hero-secondary-cta')
    expect(hero).toContain(':href="`${localePath(\'/\')}#contact`"')
    expect(robot).toContain('data-spline-state="fallback-ssr"')
    expect(robot).toContain("useFallback('fallback-error')")
    expect(robot).toContain('/hero-robot-mobile.png')
    expect(robot).toContain('https://unpkg.com/@splinetool/viewer@1.12.98/build/spline-viewer.js')
    expect(robot).not.toContain("import('@splinetool/viewer')")
    expect(robot).toContain('8_000')
    expect(robot).toContain('aria-hidden="true"')
  })
})
