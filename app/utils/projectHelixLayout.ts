export function resolveHelixLayoutTotal(visibleTotal: number, referenceTotal?: number) {
  const safeVisibleTotal = Math.max(1, Math.floor(visibleTotal))
  const safeReferenceTotal = Number.isFinite(referenceTotal)
    ? Math.max(1, Math.floor(referenceTotal ?? safeVisibleTotal))
    : safeVisibleTotal

  return Math.max(safeVisibleTotal, safeReferenceTotal)
}

export function getHelixAngleStep(layoutTotal: number) {
  return 360 / Math.max(1, Math.floor(layoutTotal))
}

export function getHelixTrackHeightVh(visibleTotal: number) {
  const projectSteps = Math.max(0, Math.floor(visibleTotal) - 1)
  if (!projectSteps) return 120

  return Math.min(700, 180 + projectSteps * 48)
}
