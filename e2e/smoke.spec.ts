import { AppNav, GroupsPage, KnockoutPage, SettingsPage, expectNoA11yViolations } from './support'
import { expect, test } from '@playwright/test'

test('app shell loads and redirects to the groups view', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/groups$/)
  await new GroupsPage(page).expectLoaded()
})

test('main navigation reaches all routes', async ({ page }) => {
  await page.goto('/')
  const nav = new AppNav(page)

  await nav.goToKnockout()
  await expect(page).toHaveURL(/\/knockout$/)
  await new KnockoutPage(page).expectLoaded()

  await nav.goToRanking()
  await expect(page).toHaveURL(/\/ranking$/)
  await expect(page.getByRole('heading', { level: 1, name: 'FIFA-Weltrangliste' })).toBeVisible()

  await nav.goToSettings()
  await expect(page).toHaveURL(/\/settings$/)
  await new SettingsPage(page).expectLoaded()
})

test('navigation starts a new page at the top and back restores the previous scroll position', async ({ page }) => {
  await page.goto('/groups')
  const nav = new AppNav(page)
  await new GroupsPage(page).expectLoaded()
  await page.evaluate(() => {
    window.scrollTo(0, 1500)
  })
  // On a phone, the opening burger menu pushes the content down, and scroll anchoring moves scrollY along with it.
  // So the position to restore is the one at the moment of the link click, which a capturing listener records.
  await page.evaluate(() => {
    document.addEventListener(
      'click',
      (event) => {
        if (event.target instanceof Element && event.target.closest('a')) {
          sessionStorage.setItem('e2e:left-at', String(window.scrollY))
        }
      },
      { capture: true },
    )
  })
  await nav.goToRanking()
  const leftAt = Number(await page.evaluate(() => sessionStorage.getItem('e2e:left-at')))
  expect(leftAt).toBeGreaterThan(1000)
  await expect(page).toHaveURL(/\/ranking$/)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await nav.expectCollapsed()

  await page.goBack()
  await expect(page).toHaveURL(/\/groups$/)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(leftAt)
})

test('home route has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await expectNoA11yViolations(page)
})

test('ranking view has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/ranking')
  await expect(page.getByRole('heading', { level: 1, name: 'FIFA-Weltrangliste' })).toBeVisible()

  await expectNoA11yViolations(page)
})
