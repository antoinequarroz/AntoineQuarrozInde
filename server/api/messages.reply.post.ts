import { Resend } from 'resend'

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const id = Number(body?.id)
  const replySubject = String(body?.subject || '').trim()
  const replyMessage = String(body?.message || '').trim()

  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Message invalide' })
  }
  if (!replySubject || !replyMessage) {
    throw createError({ statusCode: 400, message: 'Sujet et message requis' })
  }

  const config = useRuntimeConfig()
  if (!config.resendApiKey) {
    throw createError({ statusCode: 500, message: 'RESEND_API_KEY manquante' })
  }

  const supabase = getSupabaseAdmin()
  const { data: contact, error: findError } = await supabase
    .from('contact_messages')
    .select('id,name,email')
    .eq('id', id)
    .maybeSingle()

  if (findError || !contact) {
    throw createError({ statusCode: 404, message: 'Message introuvable' })
  }

  const resend = new Resend(config.resendApiKey)
  const safeSubject = escapeHtml(replySubject)
  const safeName = escapeHtml(contact.name || '')
  const safeMessage = escapeHtml(replyMessage).replaceAll('\n', '<br>')

  const { error: sendError } = await resend.emails.send({
    from: 'Portfolio <info@antoinequarroz.ch>',
    to: contact.email,
    subject: safeSubject,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <p>Bonjour ${safeName || 'à vous'},</p>
        <p style="color:#374151;line-height:1.6">${safeMessage}</p>
        <p style="margin-top:20px">Antoine Quarroz<br/>info@antoinequarroz.ch</p>
      </div>
    `,
  })

  if (sendError) {
    throw createError({ statusCode: 500, message: sendError.message || 'Erreur envoi email' })
  }

  await supabase
    .from('contact_messages')
    .update({ status: 'replied', replied_at: new Date().toISOString() })
    .eq('id', id)

  return { success: true }
})
