import type { ClientContract } from '~/types'

type ContractRow = Record<string, any>

function mapContract(row: ContractRow): ClientContract {
  return {
    id: row.id,
    clientId: row.client_id,
    projectId: row.project_id ?? null,
    quoteId: row.quote_id ?? null,
    number: row.number,
    title: row.title,
    status: row.status,
    version: row.version,
    effectiveDate: row.effective_date,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    scope: row.scope,
    deliverables: row.deliverables || [],
    providerObligations: row.provider_obligations,
    clientObligations: row.client_obligations,
    paymentTerms: row.payment_terms,
    changeManagement: row.change_management,
    intellectualProperty: row.intellectual_property,
    confidentiality: row.confidentiality,
    dataProtection: row.data_protection,
    warrantySupport: row.warranty_support,
    liability: row.liability,
    termination: row.termination,
    governingLaw: row.governing_law,
    jurisdiction: row.jurisdiction,
    specialTerms: row.special_terms,
    snapshotHash: row.snapshot_hash,
    sentAt: row.sent_at,
    signedAt: row.signed_at,
    signerName: row.signer_name,
    signerEmail: row.signer_email,
    declinedAt: row.declined_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const useContractsStore = defineStore('contracts', () => {
  const auth = useAuthStore()
  const contracts = ref<ClientContract[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  async function ensureLoaded(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const rows = await $fetch<ContractRow[]>('/api/contracts', { headers: auth.authHeader() })
      contracts.value = rows.map(mapContract)
      loaded.value = true
    } finally { loading.value = false }
  }

  async function add(payload: Omit<ClientContract, 'id' | 'createdAt' | 'updatedAt' | 'snapshotHash' | 'sentAt' | 'signedAt' | 'signerName' | 'signerEmail' | 'declinedAt'>) {
    const row = await $fetch<ContractRow>('/api/contracts', { method: 'POST', body: payload, headers: auth.authHeader() })
    const contract = mapContract(row)
    contracts.value.unshift(contract)
    return contract
  }

  async function update(id: number, payload: Partial<ClientContract>) {
    const row = await $fetch<ContractRow>('/api/contracts', { method: 'PUT', body: { ...payload, id }, headers: auth.authHeader() })
    const contract = mapContract(row)
    const index = contracts.value.findIndex(item => item.id === id)
    if (index >= 0) contracts.value[index] = contract
    return contract
  }

  async function remove(id: number) {
    await $fetch('/api/contracts', { method: 'DELETE', query: { id }, headers: auth.authHeader() })
    contracts.value = contracts.value.filter(item => item.id !== id)
  }

  return { contracts, loading, loaded, ensureLoaded, add, update, remove }
})
