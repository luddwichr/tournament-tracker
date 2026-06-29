import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

/**
 * Runs an axe-core scan with the project's standard WCAG tag set and asserts
 * there are no violations. Centralises the tag list so every view checks the
 * same conformance level.
 */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
}
