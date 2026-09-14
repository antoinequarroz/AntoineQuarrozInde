import type { Ref } from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const inertRegistry = new Map<HTMLElement, { count: number, inert: boolean, ariaHidden: string | null }>()

function acquireInert(element: HTMLElement) {
  const current = inertRegistry.get(element)
  if (current) {
    current.count++
    return
  }
  inertRegistry.set(element, { count: 1, inert: element.inert, ariaHidden: element.getAttribute('aria-hidden') })
  element.inert = true
  element.setAttribute('aria-hidden', 'true')
}

function releaseInert(element: HTMLElement) {
  const current = inertRegistry.get(element)
  if (!current) return
  current.count--
  if (current.count > 0) return
  element.inert = current.inert
  if (current.ariaHidden === null) element.removeAttribute('aria-hidden')
  else element.setAttribute('aria-hidden', current.ariaHidden)
  inertRegistry.delete(element)
}

export function useAccessibleDialog(
  isOpen: Ref<boolean>,
  close: () => void,
  initialFocusSelector?: string,
) {
  const dialogRef = ref<HTMLElement | null>(null)
  let previousFocus: HTMLElement | null = null
  let inertedElements: HTMLElement[] = []

  function setBackgroundInert(dialog: HTMLElement) {
    const elements = new Set<HTMLElement>()
    let branch: HTMLElement = dialog
    while (branch.parentElement) {
      const parent = branch.parentElement
      for (const sibling of Array.from(parent.children)) {
        if (sibling !== branch && sibling instanceof HTMLElement && !sibling.hasAttribute('data-dialog-backdrop')) elements.add(sibling)
      }
      if (parent === document.body) break
      branch = parent
    }
    inertedElements = Array.from(elements)
    inertedElements.forEach(acquireInert)
  }

  function restoreBackground() {
    inertedElements.forEach(releaseInert)
    inertedElements = []
  }

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
      if (dialogRef.value) setBackgroundInert(dialogRef.value)
      focusInitialElement()
      return
    }

    const focusTarget = previousFocus
    previousFocus = null
    restoreBackground()
    await nextTick()
    focusTarget?.focus()
  })

  onBeforeUnmount(() => {
    restoreBackground()
    previousFocus = null
  })

  return { dialogRef, handleDialogKeydown }
}
