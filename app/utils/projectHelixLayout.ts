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

export function getHelixFrontSeparationDistance(
  layoutTotal: number,
  cardWidth: number,
  horizontalRadius: number,
  baseDistance = 190,
) {
  const total = Math.max(1, Math.floor(layoutTotal))
  const existingDistance = baseDistance + Math.max(0, total - 10) * 10
  if (total <= 8) return existingDistance

  // A linear boost tends to a too-small gap as the angle between cards
  // decreases. Reserve the measured card width, room for the front scale/tilt
  // and a gutter; browser tests verify the actual projected boxes as well.
  const angleStep = getHelixAngleStep(total)
  const centerSpacing = cardWidth * 1.1 + 24
  const orbitSpacing = Math.sin(angleStep * Math.PI / 180) * horizontalRadius
  const separationWeight = Math.sin(angleStep / 80 * Math.PI)
  return Math.max(existingDistance, (centerSpacing - orbitSpacing) / separationWeight)
}

export function getHelixTrackHeightVh(visibleTotal: number) {
  const projectSteps = Math.max(0, Math.floor(visibleTotal) - 1)
  if (!projectSteps) return 120

  return Math.min(700, 180 + projectSteps * 48)
}
