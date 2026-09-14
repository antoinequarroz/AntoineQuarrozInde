import { describe, expect, it } from 'vitest'
import { isCommercialActionStatus, isCommercialActionVisible, normalizeCommercialActionStates } from '../app/utils/commercialActionState'

describe('commercial action state', () => {
  it('keeps the latest valid state for each action', () => {
    const states = normalizeCommercialActionStates([
      { payload: { actionKey: 'quote:8', status: 'snoozed', snoozedUntil: '2026-09-12' }, created_at: '2026-09-06T10:00:00Z' },
      { payload: { actionKey: 'quote:8', status: 'ignored' }, created_at: '2026-09-05T10:00:00Z' },
      { payload: { actionKey: '', status: 'handled' }, created_at: '2026-09-06T10:00:00Z' },
    ])

    expect(states['quote:8']).toMatchObject({ status: 'snoozed', snoozedUntil: '2026-09-12' })
    expect(Object.keys(states)).toHaveLength(1)
  })

  it('hides handled and ignored actions', () => {
    expect(isCommercialActionVisible('lead:1', {
      'lead:1': { actionKey: 'lead:1', status: 'handled', snoozedUntil: null, updatedAt: '' },
    }, '2026-09-06')).toBe(false)
    expect(isCommercialActionVisible('invoice:2', {
      'invoice:2': { actionKey: 'invoice:2', status: 'ignored', snoozedUntil: null, updatedAt: '' },
    }, '2026-09-06')).toBe(false)
  })

  it('shows a snoozed action again on its return date', () => {
    const states = {
      'message:4': { actionKey: 'message:4', status: 'snoozed' as const, snoozedUntil: '2026-09-09', updatedAt: '' },
    }
    expect(isCommercialActionVisible('message:4', states, '2026-09-08')).toBe(false)
    expect(isCommercialActionVisible('message:4', states, '2026-09-09')).toBe(true)
  })

  it('shows an action again when its latest decision is restored', () => {
    expect(isCommercialActionStatus('restored')).toBe(true)
    const states = normalizeCommercialActionStates([
      { payload: { actionKey: 'quote:8', status: 'restored' }, created_at: '2026-09-07T10:00:00Z' },
      { payload: { actionKey: 'quote:8', status: 'handled' }, created_at: '2026-09-06T10:00:00Z' },
    ])

    expect(states['quote:8']).toMatchObject({ status: 'restored', snoozedUntil: null })
    expect(isCommercialActionVisible('quote:8', states, '2026-09-07')).toBe(true)
  })

  it('does not hide a newly dated prospect follow-up after an older one was handled', () => {
    const states = normalizeCommercialActionStates([
      { payload: { actionKey: 'lead:9_2026-09-14', status: 'handled' }, created_at: '2026-09-14T10:00:00Z' },
    ])

    expect(isCommercialActionVisible('lead:9_2026-09-14', states, '2026-09-14')).toBe(false)
    expect(isCommercialActionVisible('lead:9_2026-09-21', states, '2026-09-21')).toBe(true)
  })

  it('applies a dated prospect decision to the undated inactivity fallback only', () => {
    const states = normalizeCommercialActionStates([
      { payload: { actionKey: 'lead:9_2026-09-14', aliasActionKey: 'lead:9', status: 'handled' }, created_at: '2026-09-14T10:00:00Z' },
    ])

    expect(isCommercialActionVisible('lead:9', states, '2026-09-15')).toBe(false)
    expect(isCommercialActionVisible('lead:9_2026-09-21', states, '2026-09-21')).toBe(true)
  })

  it('rejects an alias that does not belong to the dated prospect action', () => {
    const states = normalizeCommercialActionStates([
      { payload: { actionKey: 'lead:9_2026-09-14', aliasActionKey: 'lead:10', status: 'handled' }, created_at: '2026-09-14T10:00:00Z' },
    ])

    expect(states['lead:9_2026-09-14']).toBeDefined()
    expect(states['lead:10']).toBeUndefined()
  })
})
