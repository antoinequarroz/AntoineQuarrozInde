import { runRecurringInvoices } from '../../../utils/recurringInvoices'
export default defineEventHandler(async event => {
  const { org, user } = await requireAdmin(event)
  return runRecurringInvoices({ organizationId: org.id, actorUserId: user?.id })
})
