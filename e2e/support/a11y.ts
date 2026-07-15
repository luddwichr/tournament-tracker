import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

/**
 * Runs an axe-core scan with the project's standard tag set — WCAG 2/2.1/2.2 A
 * and AA (2.2 AA adds SC 2.5.8 Target Size, which mechanically catches
 * under-sized tap targets), plus axe-core's `best-practice` rules (which catch
 * issues, like nested `<main>` landmarks, that aren't strict WCAG violations
 * but are still real accessibility bugs) — and asserts there are no violations.
 * Centralises the tag list so every view checks the same conformance level.
 */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
  expect(results.violations).toEqual([])
}
