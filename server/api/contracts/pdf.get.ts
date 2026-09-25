import { contractDocumentData } from '../../utils/clientContract'
import { buildClientContractPdf } from '../../utils/clientContractPdf'
import { verifyContractDownloadToken } from '../../utils/contractDownloadToken'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = Number(query.id)
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Contrat invalide.' })
  const config = useRuntimeConfig()
  const downloadClaims = verifyContractDownloadToken(String(query.downloadToken || ''), config.supabaseServiceRoleKey)
  const org = downloadClaims
    ? { id: downloadClaims.organizationId }
    : (await requireAdmin(event)).org
  if (downloadClaims && downloadClaims.contractId !== id) throw createError({ statusCode: 401, message: 'Lien de téléchargement invalide.' })
  const supabase = getSupabaseAdmin()
  const { data: contract } = await supabase.from('contracts').select('*').eq('organization_id', org.id).eq('id', id).maybeSingle()
  if (!contract) throw createError({ statusCode: 404, message: 'Contrat introuvable.' })
  const [{ data: organization }, { data: client }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', org.id).single(),
    supabase.from('clients').select('*').eq('organization_id', org.id).eq('id', contract.client_id).single(),
  ])
  const pdf = await buildClientContractPdf(contractDocumentData(contract, organization || org, client), contract.signed_at ? { name: contract.signer_name, email: contract.signer_email, signedAt: contract.signed_at } : null)
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="contrat-${contract.number}-v${contract.version}.pdf"`)
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Referrer-Policy', 'no-referrer')
  setHeader(event, 'X-Contract-Snapshot', contract.snapshot_hash || 'draft')
  return pdf
})
