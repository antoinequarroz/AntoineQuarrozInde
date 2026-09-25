import { buildClientContractPdf } from '../../utils/clientContractPdf'

export default defineEventHandler(async (event) => {
  const { org, client } = await requirePortalClient(event)
  const id = Number(getQuery(event).id)
  const { data: contract } = await getSupabaseAdmin().from('contracts').select('*')
    .eq('organization_id', org.id).eq('client_id', client.id).eq('id', id).neq('status', 'draft').maybeSingle()
  if (!contract?.snapshot) throw createError({ statusCode: 404, message: 'Contrat introuvable.' })
  const pdf = await buildClientContractPdf(contract.snapshot, contract.signed_at ? { name: contract.signer_name, email: contract.signer_email, signedAt: contract.signed_at } : null)
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="contrat-${contract.number}-v${contract.version}.pdf"`)
  setHeader(event, 'X-Contract-Snapshot', contract.snapshot_hash)
  return pdf
})
