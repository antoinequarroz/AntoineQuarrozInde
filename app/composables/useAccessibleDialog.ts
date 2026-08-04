import type { Ref } from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useAccessibleDialog(
  isOpen: Ref<boolean>,
  close: () => void,
  initialFocusSelector?: string,
) {
  const dialogRef = ref<HTMLElement | null>(null)
  let previousFocus: HTMLElement | null = null

  function focusInitialElement() {
    const dialog = dialogRef.value
    if (!dialog) return
    const preferred = initialFocusSelector
      ? dialog.querySelector<HTMLElement>(initialFocusSelector)
      : null
    const firstFocusable = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    ;(preferred || firstFocusable || dialog).focus()
  }

  function handleDialogKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }

    if (event.key !== 'Tab' || !dialogRef.value) return
    const focusable = Array.from(
      dialogRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter(element => !element.hasAttribute('hidden') && element.getClientRects().length > 0)

    if (!focusable.length) {
      event.preventDefault()
      dialogRef.value.focus()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) return

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    }
    else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(isOpen, async (open) => {
    if (open) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      await nextTick()
      focusInitialElement()
      return
    }

    const focusTarget = previousFocus
    previousFocus = null
    await nextTick()
    focusTarget?.focus()
  })

  onBeforeUnmount(() => {
    previousFocus = null
  })

  return { dialogRef, handleDialogKeydown }
}
