import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

/**
 * Runs an axe-core scan with the project's standard tag set and asserts there are no violations.
 * The set covers WCAG 2, 2.1 and 2.2 at levels A and AA.
 * 2.2 AA adds SC 2.5.8 Target Size, which mechanically catches under-sized tap targets.
 * It also adds axe-core's `best-practice` rules.
 * Those catch issues such as nested `<main>` landmarks, which aren't strict WCAG violations but are still real
 * accessibility bugs.
 * Centralising the tag list keeps every view checking the same conformance level.
 */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
  expect(results.violations).toEqual([])
}
