export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
  actionLabel?: string
  onAction?: () => void | Promise<void>
}

const toasts = ref<Toast[]>([])

export function useToast() {
  function dismiss(id: number) {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }

  function push(message: string, type: ToastType, options: { duration?: number, actionLabel?: string, onAction?: () => void | Promise<void> } = {}) {
    if (!import.meta.client) return
    const id = Date.now() + Math.random()
    toasts.value = [...toasts.value, { id, message, type, actionLabel: options.actionLabel, onAction: options.onAction }]
    setTimeout(() => {
      dismiss(id)
    }, options.duration ?? (options.actionLabel ? 7000 : 3500))
  }

  async function runAction(toast: Toast) {
    dismiss(toast.id)
    await toast.onAction?.()
  }

  return {
    toasts: readonly(toasts),
    success: (msg: string, options?: Parameters<typeof push>[2]) => push(msg, 'success', options),
    error: (msg: string, options?: Parameters<typeof push>[2]) => push(msg, 'error', options),
    info: (msg: string, options?: Parameters<typeof push>[2]) => push(msg, 'info', options),
    runAction,
  }
}
