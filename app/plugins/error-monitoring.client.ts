export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.dev) return

  const reported = new Set<string>()
  const send = (error: unknown, severity: 'warning' | 'error' = 'error') => {
    const normalized = error instanceof Error ? error : new Error(String(error))
    const key = `${normalized.message}:${normalized.stack?.split('\n')[0] || ''}`
    if (reported.has(key)) return
    reported.add(key)

    const payload = JSON.stringify({
      message: normalized.message,
      stack: normalized.stack,
      path: window.location.pathname,
      severity,
    })

    if (!navigator.sendBeacon('/api/client-error', new Blob([payload], { type: 'application/json' }))) {
      void fetch('/api/client-error', { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload, keepalive: true }).catch(() => {})
    }
  }

  nuxtApp.hook('vue:error', error => send(error))
  window.addEventListener('error', event => send(event.error || event.message))
  window.addEventListener('unhandledrejection', event => send(event.reason))
})
