export function useBusinessLabels() {
  const { t, te } = useI18n()

  function statusLabel(status: string) {
    const key = `business.status.${status}`
    return te(key) ? t(key) : status
  }

  return { statusLabel }
}
