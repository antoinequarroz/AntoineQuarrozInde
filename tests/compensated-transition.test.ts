import { describe, expect, it, vi } from 'vitest'
import { runCompensatedTransition, TransitionCompensationError, TransitionConflictError } from '../server/utils/compensatedTransition'

describe('compensated transition', () => {
  it('commits after applying the source change', async () => {
    const order: string[] = []
    const result = await runCompensatedTransition({
      apply: async () => { order.push('apply'); return true },
      commit: async () => { order.push('commit'); return 'done' },
      compensate: async () => { order.push('compensate'); return true },
    })

    expect(result).toBe('done')
    expect(order).toEqual(['apply', 'commit'])
  })

  it('restores the source when the audit commit fails', async () => {
    const failure = new Error('audit unavailable')
    const compensate = vi.fn(async () => true)

    await expect(runCompensatedTransition({
      apply: async () => true,
      commit: async () => { throw failure },
      compensate,
    })).rejects.toBe(failure)
    expect(compensate).toHaveBeenCalledOnce()
  })

  it('reports conflicts and failed compensation explicitly', async () => {
    await expect(runCompensatedTransition({
      apply: async () => false,
      commit: async () => 'never',
      compensate: async () => true,
    })).rejects.toBeInstanceOf(TransitionConflictError)

    await expect(runCompensatedTransition({
      apply: async () => true,
      commit: async () => { throw new Error('audit unavailable') },
      compensate: async () => false,
    })).rejects.toBeInstanceOf(TransitionCompensationError)
  })
})
