import { describe, expect, it } from 'vitest'
import { getProjectPresentation } from '../app/utils/projectPresentation'

describe('reviewed public project presentation', () => {
  it('distinguishes the approved client example from explicitly personal projects', () => {
    expect(getProjectPresentation({ slug: 'physiobaur' }).kind).toBe('client')
    for (const slug of ['aventuretime-aq', 'threejs-cv', 'envvault', 'hermes-cockpit', 'postmelo', 'orion', 'velqora', 'staq', 'livrematch', 'chat-d-interieur', 'bagage-malin', 'rangements-malins']) {
      expect(getProjectPresentation({ slug }).kind, slug).toBe('personal')
    }
  })

  it('labels the confirmed prototypes and betas without claiming their project origin', () => {
    for (const slug of ['envvault', 'postmelo', 'nino', 'remembeyes', 'lifxp', 'velqora']) {
      expect(getProjectPresentation({ slug }).inDevelopment, slug).toBe(true)
    }
    for (const slug of ['nino', 'remembeyes', 'lifxp']) {
      expect(getProjectPresentation({ slug }).kind, slug).toBeUndefined()
    }
  })

  it('does not turn preparation for another platform into a whole-project development claim', () => {
    expect(getProjectPresentation({ slug: 'zedline' })).toEqual({ inDevelopment: false })
    expect(getProjectPresentation({ slug: 'hermes-cockpit' })).toEqual({ kind: 'personal', inDevelopment: false })
  })

  it('leaves unverified client relationships and new projects unclassified', () => {
    for (const slug of ['respire', 'rallye-team-quarroz', 'carnadzons', 'le-saint-martin-restobar', 'a-new-project', '__proto__', 'constructor', 'toString']) {
      expect(getProjectPresentation({ slug }), slug).toEqual({ inDevelopment: false })
    }
  })

  it('does not infer a relationship or development status from internal data or prose', () => {
    const project = {
      slug: 'a-new-project',
      clientId: 123,
      category: 'web',
      liveUrl: null,
      workflowStatus: 'active',
      description: 'Projet personnel en développement pour un client.',
    }
    expect(getProjectPresentation(project)).toEqual({ inDevelopment: false })
  })
})
