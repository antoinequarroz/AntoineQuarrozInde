import { expect, type Locator, type Page } from '@playwright/test'

export async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }))
  expect(metrics.document, `document width ${metrics.document}px exceeds viewport ${metrics.viewport}px`).toBeLessThanOrEqual(metrics.viewport + 1)
}

export async function expectTouchTarget(locator: Locator) {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()
  expect(box, 'touch target must have a bounding box').toBeTruthy()
  expect(box!.width, 'touch target must be at least 40px wide').toBeGreaterThanOrEqual(40)
  expect(box!.height, 'touch target must be at least 40px high').toBeGreaterThanOrEqual(40)
}

export async function expectDialogFitsViewport(page: Page, dialog: Locator) {
  await expect(dialog).toBeVisible()
  const fits = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return rect.left >= -1
      && rect.right <= window.innerWidth + 1
      && element.scrollWidth <= window.innerWidth + 1
  })
  expect(fits, 'dialog must fit the mobile viewport').toBe(true)
}

export async function activateWithKeyboard(page: Page, trigger: Locator) {
  await trigger.focus()
  await expect(trigger).toBeFocused()
  await trigger.press('Enter')
}
