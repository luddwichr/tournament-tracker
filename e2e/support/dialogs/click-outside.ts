import type { Locator, Page } from '@playwright/test'

/**
 * Clicks the backdrop just above an open dialog.
 * On a phone the dialog spans the full width, so the only free backdrop is the strip above or below it.
 */
export async function clickOutsideDialog(page: Page, dialog: Locator): Promise<void> {
  const box = await dialog.boundingBox()
  if (!box) throw new Error('The dialog has no bounding box, so it is not rendered')
  if (box.y < 2) throw new Error(`The dialog starts at y=${box.y}, so there is no backdrop above it to click`)
  await page.mouse.click(box.x + box.width / 2, box.y / 2)
}
