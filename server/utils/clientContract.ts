import { createHash } from 'node:crypto'
import { DEFAULT_CONTRACT_TERMS, normalizeDeliverables } from '../../shared/utils/clientContracts'

const text = (value: unknown, max = 20_000) => String(value || '').trim().slice(0, max)
const optionalId = (value: unknown) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function normalizeContractPayload(body: Record<string, any>) {
  const number = text(body.number, 80)
  const title = text(body.title, 240)
  const clientId = optionalId(body.clientId)
  const scope = text(body.scope || DEFAULT_CONTRACT_TERMS.scope)
  if (!number || !title || !clientId || !scope) {
    throw createError({ statusCode: 400, message: 'Numéro, client, titre et périmètre sont obligatoires.' })
  }
  const startsAt = text(body.startsAt, 10) || null
  const endsAt = text(body.endsAt, 10) || null
  if (startsAt && endsAt && endsAt < startsAt) throw createError({ statusCode: 400, message: 'La date de fin doit suivre la date de début.' })
  return {
    client_id: clientId,
    project_id: optionalId(body.projectId),
    quote_id: optionalId(body.quoteId),
    number,
    title,
    version: Math.max(1, Math.min(999, Number(body.version) || 1)),
    effective_date: text(body.effectiveDate, 10) || null,
    starts_at: startsAt,
    ends_at: endsAt,
    scope,
    deliverables: normalizeDeliverables(body.deliverables),
    provider_obligations: text(body.providerObligations || DEFAULT_CONTRACT_TERMS.providerObligations),
    client_obligations: text(body.clientObligations || DEFAULT_CONTRACT_TERMS.clientObligations),
    payment_terms: text(body.paymentTerms || DEFAULT_CONTRACT_TERMS.paymentTerms),
    change_management: text(body.changeManagement || DEFAULT_CONTRACT_TERMS.changeManagement),
    intellectual_property: text(body.intellectualProperty || DEFAULT_CONTRACT_TERMS.intellectualProperty),
    confidentiality: text(body.confidentiality || DEFAULT_CONTRACT_TERMS.confidentiality),
    data_protection: text(body.dataProtection || DEFAULT_CONTRACT_TERMS.dataProtection),
    warranty_support: text(body.warrantySupport || DEFAULT_CONTRACT_TERMS.warrantySupport),
    liability: text(body.liability || DEFAULT_CONTRACT_TERMS.liability),
    termination: text(body.termination || DEFAULT_CONTRACT_TERMS.termination),
    governing_law: text(body.governingLaw || DEFAULT_CONTRACT_TERMS.governingLaw, 240),
    jurisdiction: text(body.jurisdiction || DEFAULT_CONTRACT_TERMS.jurisdiction, 240),
    special_terms: text(body.specialTerms),
  }
}

export function contractSnapshot(contract: Record<string, any>, organization: Record<string, any>, client: Record<string, any>) {
  return {
    schemaVersion: 1,
    contract: {
      number: contract.number,
      version: contract.version,
      title: contract.title,
      effectiveDate: contract.effective_date,
      startsAt: contract.starts_at,
      endsAt: contract.ends_at,
      scope: contract.scope,
      deliverables: contract.deliverables || [],
      providerObligations: contract.provider_obligations,
      clientObligations: contract.client_obligations,
      paymentTerms: contract.payment_terms,
      changeManagement: contract.change_management,
      intellectualProperty: contract.intellectual_property,
      confidentiality: contract.confidentiality,
      dataProtection: contract.data_protection,
      warrantySupport: contract.warranty_support,
      liability: contract.liability,
      termination: contract.termination,
      governingLaw: contract.governing_law,
      jurisdiction: contract.jurisdiction,
      specialTerms: contract.special_terms,
    },
    provider: {
      name: organization.billing_name || organization.name,
      street: organization.billing_street || '',
      building: organization.billing_building || '',
      postalCode: organization.billing_postal_code || '',
      city: organization.billing_city || '',
      country: organization.billing_country || 'CH',
      email: organization.billing_email || '',
      phone: organization.billing_phone || '',
      uid: organization.billing_uid || '',
    },
    client: {
      name: client.name,
      company: client.company || '',
      email: client.email,
      street: client.billing_street || '',
      building: client.billing_building || '',
      postalCode: client.billing_postal_code || '',
      city: client.billing_city || '',
      country: client.billing_country || 'CH',
    },
  }
}

export function hashContractSnapshot(snapshot: Record<string, any>) {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
}

export function contractDocumentData(contract: Record<string, any>, organization: Record<string, any>, client: Record<string, any>) {
  return contract.snapshot || contractSnapshot(contract, organization, client)
}
