import { createContractDownloadToken } from '../../utils/contractDownloadToken'

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const id = Number((await readBody(event))?.id)
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Contrat invalide.' })

  const supabase = getSupabaseAdmin()
  const { data: contract } = await supabase
    .from('contracts')
    .select('id')
    .eq('organization_id', org.id)
    .eq('id', id)
    .maybeSingle()
  if (!contract) throw createError({ statusCode: 404, message: 'Contrat introuvable.' })

  const config = useRuntimeConfig()
  const token = createContractDownloadToken({
    contractId: id,
    organizationId: org.id,
    expiresAt: Date.now() + 60_000,
  }, config.supabaseServiceRoleKey)

  setHeader(event, 'Cache-Control', 'no-store')
  return { url: `/api/contracts/pdf?id=${id}&downloadToken=${encodeURIComponent(token)}` }
})
