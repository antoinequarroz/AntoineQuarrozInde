import { sendBillingEmail } from '../../utils/billingEmail'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const id = Number((await readBody(event))?.id)
  if (!id) throw createError({ statusCode: 400, message: 'Devis invalide.' })
  const supabase = getSupabaseAdmin()
  const { data: quote } = await supabase.from('quotes').select('id,number,client_id,status').eq('organization_id', org.id).eq('id', id).single()
  if (!quote?.client_id) throw createError({ statusCode: 400, message: 'Client manquant.' })
  const { data: client } = await supabase.from('clients').select('id,name,email').eq('organization_id', org.id).eq('id', quote.client_id).single()
  if (!client?.email) throw createError({ statusCode: 400, message: 'Adresse email client manquante.' })
  const result = await sendBillingEmail({ kind: 'quote', organizationId: org.id, documentId: id, recipientEmail: client.email, recipientName: client.name })
  if (quote.status === 'draft') await supabase.from('quotes').update({ status: 'sent' }).eq('organization_id', org.id).eq('id', id)
  await logAudit({ organizationId: org.id, actorUserId: user?.id, action: 'quote.email_sent', entityType: 'quote', entityId: id, clientId: client.id, payload: { number: quote.number, emailId: result.emailId, engine: result.engine } })
  return { success: true, emailId: result.emailId, engine: result.engine }
})
