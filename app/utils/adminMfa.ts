export type AdminMfaMode = 'optional' | 'required'
export type AdminMfaLevel = 'aal1' | 'aal2' | null

export function normalizeAdminMfaMode(value: unknown): AdminMfaMode {
  return String(value).trim().toLowerCase() === 'optional' ? 'optional' : 'required'
}

export function requiresAdminMfa(
  mode: AdminMfaMode,
  currentLevel: AdminMfaLevel,
  nextLevel: AdminMfaLevel,
  assuranceKnown: boolean,
) {
  if (!assuranceKnown) return true
  if (currentLevel === 'aal2') return false
  return mode === 'required' || nextLevel === 'aal2'
}

export function normalizeTotpCode(value: string) {
  return value.replace(/\D/g, '').slice(0, 6)
}

export function safeAdminRedirect(value: unknown) {
  const candidate = Array.isArray(value) ? value[0] : value
  if (typeof candidate !== 'string') return '/admin'
  const isAdminPath = candidate === '/admin'
    || candidate.startsWith('/admin/')
    || candidate.startsWith('/admin?')
    || candidate.startsWith('/admin#')
  if (!isAdminPath || candidate.startsWith('//')) return '/admin'
  if (candidate.startsWith('/admin/login') || candidate.startsWith('/admin/security')) return '/admin'
  return candidate
}

export function safePortalRedirect(value: unknown) {
  const candidate = Array.isArray(value) ? value[0] : value
  if (typeof candidate !== 'string') return '/portal'
  const isPortalPath = candidate === '/portal'
    || candidate.startsWith('/portal/')
    || candidate.startsWith('/portal?')
    || candidate.startsWith('/portal#')
  if (!isPortalPath || candidate.startsWith('//')) return '/portal'
  if (candidate.startsWith('/portal/login')) return '/portal'
  return candidate
}

export function safeMfaRedirect(value: unknown) {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === 'string'
    && (candidate === '/portal' || candidate.startsWith('/portal/') || candidate.startsWith('/portal?') || candidate.startsWith('/portal#'))
    ? safePortalRedirect(candidate)
    : safeAdminRedirect(candidate)
}
