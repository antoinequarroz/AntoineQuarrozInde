import { timingSafeEqual } from 'node:crypto'
import { runPipelineReminders } from '../../utils/pipelineReminders'

function matchesSecret(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

export default defineEventHandler(async (event) => {
  const expectedSecret = String(process.env.PIPELINE_AUTOMATION_SECRET || '')
  const receivedSecret = String(getHeader(event, 'x-automation-secret') || '')
  if (!expectedSecret || !receivedSecret || !matchesSecret(receivedSecret, expectedSecret)) {
    throw createError({ statusCode: 401, message: 'Automatisation non autorisée.' })
  }

  const config = useRuntimeConfig()
  const organizationSlug = String(config.public.defaultOrganizationSlug || '')
  if (!organizationSlug) throw createError({ statusCode: 500, message: 'Organisation automatique non configurée.' })
  const supabase = getSupabaseAdmin()
  const { data: organization, error } = await supabase.from('organizations').select('id').eq('slug', organizationSlug).maybeSingle()
  if (error || !organization) throw createError({ statusCode: 500, message: error?.message || 'Organisation introuvable.' })

  return await runPipelineReminders({ organizationId: organization.id, actorUserId: null, actorEmail: null, trigger: 'scheduled' })
})
