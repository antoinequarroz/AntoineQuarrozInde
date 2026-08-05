import { createHash } from 'node:crypto'

type ErrorSource = 'client' | 'server'
type ErrorSeverity = 'warning' | 'error' | 'fatal'

interface ErrorReport {
  source: ErrorSource
  severity?: ErrorSeverity
  message: string
  stack?: string | null
  path?: string | null
  organizationId?: string | null
  metadata?: Record<string, unknown>
}

const alertCooldown = new Map<string, number>()

function truncate(value: string | null | undefined, maxLength: number) {
  return value ? value.slice(0, maxLength) : null
}

export async function reportApplicationError(report: ErrorReport) {
  try {
    const message = truncate(report.message, 2_000) || 'Unknown application error'
    const stack = truncate(report.stack, 12_000)
    const path = truncate(report.path, 1_000)
    const fingerprint = createHash('sha256')
      .update(`${report.source}:${message}:${stack?.split('\n')[0] || ''}`)
      .digest('hex')

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('application_errors').insert({
      organization_id: report.organizationId || null,
      source: report.source,
      severity: report.severity || 'error',
      message,
      stack,
      path,
      fingerprint,
      metadata: report.metadata || {},
    })

    if (error) throw error

    const config = useRuntimeConfig()
    const recipient = config.monitoringAlertEmail || config.contactEmail
    const lastAlert = alertCooldown.get(fingerprint) || 0
    if (!config.resendApiKey || !recipient || Date.now() - lastAlert < 10 * 60 * 1000) return

    alertCooldown.set(fingerprint, Date.now())
    await $fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.resendApiKey}` },
      body: {
        from: 'Monitoring <onboarding@resend.dev>',
        to: [recipient],
        subject: `[${report.severity || 'error'}] Erreur application Antoine Quarroz`,
        text: `${message}\n\nSource: ${report.source}\nPage: ${path || 'inconnue'}\nEmpreinte: ${fingerprint}`,
      },
    })
  }
  catch (error) {
    console.error('[error-monitoring] Unable to persist error report', error)
  }
}
