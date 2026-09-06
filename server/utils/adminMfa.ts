type AdminMfaMode = 'optional' | 'required'

type AuthUserWithFactors = {
  factors?: Array<{
    status?: string
  }>
} | null | undefined

const ADMIN_MFA_MODES = new Set<AdminMfaMode>(['optional', 'required'])
const AUTHENTICATOR_ASSURANCE_LEVELS = new Set(['aal1', 'aal2'])

function machineError(statusCode: number, statusMessage: string, code: string) {
  return createError({
    statusCode,
    statusMessage,
    message: statusMessage,
    data: { code },
  })
}

function bearerToken(event: any) {
  const authorization = String(getHeader(event, 'authorization') || '')
  if (!authorization.startsWith('Bearer ')) return null
  return authorization.slice('Bearer '.length).trim() || null
}

export function resolveAdminMfaMode(value: unknown): AdminMfaMode {
  const mode = String(value ?? '').trim().toLowerCase()
  if (ADMIN_MFA_MODES.has(mode as AdminMfaMode)) return mode as AdminMfaMode

  throw machineError(
    500,
    'Invalid administrator MFA configuration',
    'ADMIN_MFA_MODE_INVALID',
  )
}

export async function requireAdminMfa(event: any, authenticatedUser?: AuthUserWithFactors) {
  const config = useRuntimeConfig()
  const mode = resolveAdminMfaMode(config.public?.adminMfaMode)
  const token = bearerToken(event)

  if (!token) {
    throw machineError(401, 'Unauthorized', 'AUTH_REQUIRED')
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(token)

  if (error || !data) {
    throw machineError(401, 'Unable to verify the authenticated session', 'AUTH_SESSION_INVALID')
  }

  if (
    !AUTHENTICATOR_ASSURANCE_LEVELS.has(String(data.currentLevel))
    || !AUTHENTICATOR_ASSURANCE_LEVELS.has(String(data.nextLevel))
  ) {
    throw machineError(401, 'Invalid authenticator assurance level', 'MFA_ASSURANCE_INVALID')
  }

  let user = authenticatedUser
  if (!Array.isArray(user?.factors)) {
    const userResult = await supabase.auth.getUser(token)
    if (userResult.error || !userResult.data.user) {
      throw machineError(401, 'Unable to verify the authenticated session', 'AUTH_SESSION_INVALID')
    }
    user = userResult.data.user
  }

  const hasVerifiedFactor = data.nextLevel === 'aal2'
    || user?.factors?.some(factor => factor.status === 'verified') === true

  if (!hasVerifiedFactor) {
    if (mode === 'optional') return { mode, currentLevel: data.currentLevel, hasVerifiedFactor }
    throw machineError(403, 'Multi-factor authentication enrollment is required', 'MFA_ENROLLMENT_REQUIRED')
  }

  if (data.currentLevel !== 'aal2') {
    throw machineError(403, 'Multi-factor authentication is required', 'MFA_REQUIRED')
  }

  return { mode, currentLevel: data.currentLevel, hasVerifiedFactor }
}
