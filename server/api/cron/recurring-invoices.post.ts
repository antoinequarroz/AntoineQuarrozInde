import { timingSafeEqual } from 'node:crypto'
import { runRecurringInvoices } from '../../utils/recurringInvoices'

export default defineEventHandler(async (event) => {
  const expected = String(process.env.RECURRING_AUTOMATION_SECRET || '')
  const received = String(getHeader(event, 'x-automation-secret') || '')
  const valid = expected && received && Buffer.byteLength(expected) === Buffer.byteLength(received) && timingSafeEqual(Buffer.from(expected), Buffer.from(received))
  if (!valid) throw createError({ statusCode: 401, message: 'Automatisation non autorisée.' })
  const slug = String(useRuntimeConfig().public.defaultOrganizationSlug || '')
  const { data: org } = await getSupabaseAdmin().from('organizations').select('id').eq('slug', slug).maybeSingle()
  if (!org) throw createError({ statusCode: 500, message: 'Organisation automatique introuvable.' })
  return runRecurringInvoices({ organizationId: org.id })
})
