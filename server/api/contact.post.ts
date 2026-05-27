import { Resend } from 'resend'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, email, subject, message } = body

  if (!name || !email || !message) {
    throw createError({ statusCode: 400, message: 'Champs requis manquants' })
  }

  const config = useRuntimeConfig()

  // If no API key configured, return success anyway (dev mode)
  if (!config.resendApiKey) {
    console.warn('[contact] RESEND_API_KEY not set — email not actually sent')
    return { success: true }
  }

  const resend = new Resend(config.resendApiKey)

  const safeSubject = subject?.trim() ? subject.trim() : 'Nouveau message'

  const { error } = await resend.emails.send({
    from: 'Portfolio <noreply@quarroz.dev>',
    to: config.contactEmail,
    replyTo: email,
    subject: `[Portfolio] ${safeSubject}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#7c3aed">Nouveau message depuis le portfolio</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#6b7280;width:100px">De</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Email</td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Sujet</td><td style="padding:8px 0">${safeSubject}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
        <p style="color:#374151;line-height:1.6;white-space:pre-wrap">${message}</p>
      </div>
    `,
  })

  if (error) {
    throw createError({ statusCode: 500, message: 'Erreur lors de l\'envoi' })
  }

  return { success: true }
})
