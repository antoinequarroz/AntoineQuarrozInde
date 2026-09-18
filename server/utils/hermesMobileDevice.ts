import type { H3Event } from 'h3'
import { hashHermesMobileToken, validateHermesMobileToken } from './hermesMobile'

export async function requireHermesMobileDevice(event: H3Event) {
  const token = validateHermesMobileToken(getHeader(event, 'authorization'))
  if (!token) throw createError({ statusCode: 401, message: 'Appareil non autorisé.' })
  const { data, error } = await getSupabaseAdmin().from('hermes_mobile_devices')
    .select('id,organization_id').eq('token_hash', hashHermesMobileToken(token)).is('revoked_at', null).maybeSingle()
  if (error) throw createError({ statusCode: 500, message: 'Vérification de l’appareil impossible.' })
  if (!data) throw createError({ statusCode: 401, message: 'Appareil révoqué ou inconnu.' })
  return data
}
