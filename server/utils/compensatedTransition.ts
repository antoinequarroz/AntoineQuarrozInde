export class TransitionConflictError extends Error {}
export class TransitionCompensationError extends Error {
  override cause: unknown

  constructor(cause: unknown) {
    super('La transition a échoué et son état initial n’a pas pu être restauré.')
    this.cause = cause
  }
}

export async function runCompensatedTransition<T>(dependencies: {
  apply: () => Promise<boolean>
  commit: () => Promise<T>
  compensate: () => Promise<boolean>
}) {
  const applied = await dependencies.apply()
  if (!applied) throw new TransitionConflictError('La donnée source a changé.')

  try {
    return await dependencies.commit()
  }
  catch (error) {
    const compensated = await dependencies.compensate().catch(() => false)
    if (!compensated) throw new TransitionCompensationError(error)
    throw error
  }
}
