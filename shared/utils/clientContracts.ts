export const CONTRACT_STATUSES = ['draft', 'sent', 'signed', 'declined', 'cancelled'] as const
export type ContractStatus = typeof CONTRACT_STATUSES[number]

export type ContractTerms = {
  scope: string
  deliverables: string[]
  providerObligations: string
  clientObligations: string
  paymentTerms: string
  changeManagement: string
  intellectualProperty: string
  confidentiality: string
  dataProtection: string
  warrantySupport: string
  liability: string
  termination: string
  governingLaw: string
  jurisdiction: string
  specialTerms: string
}

export const DEFAULT_CONTRACT_TERMS: ContractTerms = {
  scope: 'Conception et réalisation de la prestation décrite dans le devis et les livrables ci-dessous.',
  deliverables: ['Cadrage et conception', 'Réalisation', 'Recette et mise en production'],
  providerObligations: 'Le prestataire réalise les prestations avec diligence, informe le client des risques identifiés et respecte les jalons convenus sous réserve de la collaboration du client.',
  clientObligations: 'Le client fournit dans les délais les contenus, accès, validations et informations nécessaires. Tout retard de validation peut décaler le calendrier.',
  paymentTerms: 'Les montants, acomptes, échéances et modalités de paiement sont ceux du devis lié. Les prestations supplémentaires font l’objet d’un accord écrit avant exécution.',
  changeManagement: 'Toute demande hors périmètre est évaluée avant réalisation. Son impact sur le prix et le calendrier doit être accepté par écrit par les deux parties.',
  intellectualProperty: 'Après paiement intégral, le client reçoit les droits d’utilisation convenus sur les livrables spécifiques. Les composants, outils, bibliothèques et savoir-faire préexistants restent la propriété de leur titulaire.',
  confidentiality: 'Chaque partie protège les informations confidentielles reçues et les utilise uniquement pour l’exécution du contrat, sauf obligation légale ou accord écrit.',
  dataProtection: 'Chaque partie traite les données personnelles sous sa responsabilité conformément au droit applicable. Les accès confiés au prestataire sont limités aux besoins de la prestation.',
  warrantySupport: 'Les anomalies reproductibles relevant du périmètre accepté sont corrigées pendant la période indiquée au devis. Les évolutions, contenus et services tiers sont traités séparément.',
  liability: 'Chaque partie répond des dommages directs causés par une violation prouvée de ses obligations. La responsabilité ne couvre pas les pertes indirectes, sous réserve des limites impératives du droit applicable.',
  termination: 'En cas de manquement important non corrigé après notification écrite et délai raisonnable, l’autre partie peut résilier le contrat. Les prestations réalisées et frais engagés restent dus.',
  governingLaw: 'Droit suisse',
  jurisdiction: 'Valais, Suisse',
  specialTerms: '',
}

export function normalizeDeliverables(value: unknown) {
  const rows = Array.isArray(value) ? value : String(value || '').split('\n')
  return rows.map(item => String(item || '').trim()).filter(Boolean).slice(0, 50)
}
