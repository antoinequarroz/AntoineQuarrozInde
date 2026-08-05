import { reportApplicationError } from '../utils/errorReporting'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', async (error, context) => {
    const statusCode = (error as { statusCode?: number }).statusCode || 500
    if (statusCode < 500) return

    await reportApplicationError({
      source: 'server',
      severity: statusCode >= 500 ? 'fatal' : 'error',
      message: error.message,
      stack: error.stack,
      path: context.event?.path,
      organizationId: context.event?.context?.organization?.id,
      metadata: { statusCode },
    })
  })
})
