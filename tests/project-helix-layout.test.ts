import { describe, expect, it } from 'vitest'
import {
  getHelixAngleStep,
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
})
