export type SplineFallbackReason = 'motion' | 'network' | 'unsupported'

export type SplineLoadDecision =
  | { load: true }
  | { load: false, reason: SplineFallbackReason }

export function decideSplineLoading(input: {
  reducedMotion: boolean
  saveData?: boolean
  effectiveType?: string
  webglSupported: boolean
}): SplineLoadDecision {
  if (input.reducedMotion) return { load: false, reason: 'motion' }
  if (input.saveData || /(^|-)2g$/i.test(input.effectiveType || '')) {
    return { load: false, reason: 'network' }
  }
  if (!input.webglSupported) return { load: false, reason: 'unsupported' }
  return { load: true }
}

export function supportsWebGL(documentRef: Pick<Document, 'createElement'> = document) {
  try {
    const canvas = documentRef.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  }
  catch {
    return false
  }
}
