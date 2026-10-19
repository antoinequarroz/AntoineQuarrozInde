import { describe, expect, it } from 'vitest'
import {
  getHelixAngleStep,
  getHelixFrontSeparationDistance,
  getHelixTrackHeightVh,
  resolveHelixLayoutTotal,
} from '../app/utils/projectHelixLayout'

describe('project helix layout', () => {
  it('keeps the complete portfolio as the visual density reference', () => {
    const allLayoutTotal = resolveHelixLayoutTotal(16, 16)
    const mobileLayoutTotal = resolveHelixLayoutTotal(3, 16)

    expect(mobileLayoutTotal).toBe(allLayoutTotal)
    expect(getHelixAngleStep(mobileLayoutTotal)).toBe(getHelixAngleStep(allLayoutTotal))
    expect(getHelixAngleStep(mobileLayoutTotal)).toBe(22.5)
  })

  it('never compresses a selection when the reference total is stale', () => {
    expect(resolveHelixLayoutTotal(11, 3)).toBe(11)
    expect(resolveHelixLayoutTotal(3)).toBe(3)
  })

  it('keeps a steady scroll distance per transition without the old minimum', () => {
    expect(getHelixTrackHeightVh(16)).toBe(700)
    expect(getHelixTrackHeightVh(11)).toBe(660)
    expect(getHelixTrackHeightVh(3)).toBe(276)
    expect(getHelixTrackHeightVh(1)).toBe(120)
  })

  it.each([8, 17, 21, 30, 60, 100])('keeps adjacent front centers apart with %s projects at every transition fraction', (total) => {
    for (const [cardWidth, radius] of [[259.2, 205], [280, 240], [280, 270]] as const) {
      const step = getHelixAngleStep(total)
      const distance = getHelixFrontSeparationDistance(total, cardWidth, radius)
      const x = (angle: number) => Math.sin(angle * Math.PI / 180) * radius
        + Math.sin(angle / 80 * Math.PI) * distance

      for (const fraction of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
        const centersApart = x(step * fraction) + x(step * (1 - fraction))
        expect(centersApart).toBeGreaterThanOrEqual(cardWidth * 1.1 + 24 - 0.001)
      }
    }
  })

  it('preserves the density of a filtered selection and the existing sparse orbit', () => {
    const reference = resolveHelixLayoutTotal(3, 21)
    expect(getHelixFrontSeparationDistance(reference, 259.2, 205))
      .toBe(getHelixFrontSeparationDistance(21, 259.2, 205))
    expect(getHelixFrontSeparationDistance(8, 259.2, 205)).toBe(190)
    expect(getHelixFrontSeparationDistance(5, 259.2, 205)).toBe(190)
    expect(getHelixFrontSeparationDistance(1, 259.2, 205)).toBe(190)
  })
})
