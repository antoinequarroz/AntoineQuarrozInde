import { describe, expect, it } from 'vitest'
import { normalizeClientAttribution } from '../server/utils/clientAttribution'

describe('client attribution', () => {
  it('normalizes editable CRM attribution values', () => {
    expect(normalizeClientAttribution({
      acquisitionSource: '  Recommandation  client ',
      acquisitionMedium: ' bouche   à oreille ',
      acquisitionCampaign: ' Réseau Valais ',
    })).toEqual({
      acquisition_source: 'Recommandation client',
      acquisition_medium: 'bouche à oreille',
      acquisition_campaign: 'Réseau Valais',
    })
  })

  it('converts unsupported and empty values to null', () => {
    expect(normalizeClientAttribution({ acquisitionSource: {}, acquisitionMedium: '  ' })).toEqual({
      acquisition_source: null,
      acquisition_medium: null,
      acquisition_campaign: null,
    })
  })
})
