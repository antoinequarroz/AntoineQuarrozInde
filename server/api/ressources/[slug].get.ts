export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '')
  const token = String(getQuery(event).token || '')
  const config = useRuntimeConfig()
  const secret = String(config.supabaseServiceRoleKey || '')

  if (slug !== IA_PME_LEAD_MAGNET_SLUG || !verifyLeadMagnetToken(token, slug, secret)) {
    throw createError({ statusCode: 401, message: 'Ce lien de téléchargement est invalide ou a expiré.' })
  }

  const pdf = await useStorage('assets:server').getItemRaw<Uint8Array>(IA_PME_LEAD_MAGNET_FILE)
  if (!pdf) throw createError({ statusCode: 404, message: 'La checklist est momentanément indisponible.' })

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', 'attachment; filename="checklist-pilote-ia-pme-30-jours.pdf"')
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  return pdf
})
