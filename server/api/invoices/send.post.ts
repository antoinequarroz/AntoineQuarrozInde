import { sendBillingEmail } from '../../utils/billingEmail'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const id = Number((await readBody(event))?.id)
  if (!id) throw createError({ statusCode: 400, message: 'Facture invalide.' })
  const supabase = getSupabaseAdmin()
  const { data: invoice } = await supabase.from('invoices').select('id,number,client_id,status').eq('organization_id', org.id).eq('id', id).single()
  if (!invoice?.client_id) throw createError({ statusCode: 400, message: 'Client manquant.' })
  const { data: client } = await supabase.from('clients').select('id,name,email').eq('organization_id', org.id).eq('id', invoice.client_id).single()
  if (!client?.email) throw createError({ statusCode: 400, message: 'Adresse email client manquante.' })
  const result = await sendBillingEmail({ kind: 'invoice', organizationId: org.id, documentId: id, recipientEmail: client.email, recipientName: client.name })
  if (invoice.status === 'draft') await supabase.from('invoices').update({ status: 'sent' }).eq('organization_id', org.id).eq('id', id)
  await logAudit({ organizationId: org.id, actorUserId: user?.id, action: 'invoice.email_sent', entityType: 'invoice', entityId: id, clientId: client.id, payload: { number: invoice.number, emailId: result.emailId, engine: result.engine } })
  return { success: true, emailId: result.emailId, engine: result.engine }
})
