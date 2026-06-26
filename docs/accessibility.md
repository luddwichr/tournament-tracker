# Accessibility (a11y)

Target: **WCAG 2.1 AA**. Linted with `eslint-plugin-vuejs-accessibility` and
scanned in e2e with `@axe-core/playwright` on every route.

## Checklist (applies to every feature)

- **Semantic HTML first:** `<nav>`, `<main>`, `<header>`, `<table>` for
  standings, `<button>` for actions (never clickable `<div>`s), `<dialog>` for
  modals.
- **Visible focus ring** on every interactive element (global
  `:focus-visible` in `base.css`). Manage focus on route change and after
  dialog open/close.
- **Color contrast** ≥ 4.5:1 body text, ≥ 3:1 large/UI. Never convey state by
  color alone — pair with an icon, glyph or letter (W/D/L).
- **Form labels** associated via `<label for>` or wrapping.
- **ARIA live region** announces score updates and route/dialog changes
  (`role="status"`, `aria-live="polite"`).
- **`prefers-reduced-motion`** honored (handled globally in `reset.css`).
- **Keyboard support** end-to-end: logical Tab order, Enter/Space to activate,
  Esc to close dialogs.
- **Tap targets** ≥ 44×44px (token `--tap-target`).

## Designed for age-6 readers

- Big flags as the primary identifier; team name secondary.
- Large numerals for scores (`--font-size-score`, ≥ 32px on mobile).
- Universally recognized icons (trophy/lock/calendar) **paired** with a short
  German label so screen readers and adults also understand.
- Plain German vocabulary, short sentences.

## Current scaffold (M1)

- Skip link to `#main`.
- `<main tabindex="-1">` receives focus on route change; the change is announced
  via a polite live region in `App.vue`.
- Smoke e2e (`tests/e2e/smoke.spec.ts`) runs axe-core on the home route with
  tags `wcag2a/wcag2aa/wcag21a/wcag21aa` and asserts zero violations.

## Test approach

- **Unit:** component-level assertions (roles, labels) via `@vue/test-utils`.
- **e2e:** `axe-core` scan per route (`tests/e2e/a11y.spec.ts` from M3 onward),
  plus keyboard-driven flows for dialogs.
