# Testing & linting

Pinned (exact) at scaffold time (2026-06-26):

| Package                | Version  |
| ---------------------- | -------- |
| `vitest`               | `4.1.9`  |
| `@vitest/coverage-v8`  | `4.1.9`  |
| `@vue/test-utils`      | `2.4.11` |
| `jsdom`                | `29.1.1` |
| `@playwright/test`     | `1.61.1` |
| `@axe-core/playwright` | `4.12.1` |
| `oxlint`               | `1.71.0` |
| `oxfmt`                | `0.56.0` |

## Unit tests (Vitest)

- Config lives in `vite.config.ts` under `test` (`environment: 'jsdom'`,
  `globals: true`, `include: ['tests/unit/**/*.spec.ts']`, `css: true`).
- Run with `npm run test:unit` (`vitest run`) or `npm run test:unit:watch`.
- Business logic in `src/lib/` is unit-tested in isolation.

## e2e tests (Playwright)

- Config in `playwright.config.ts`; `testDir: ./tests/e2e`; chromium project.
- `webServer` boots `npm run dev` on port 5173 and reuses an existing server
  locally.
- Run with `npm run test:e2e`. Browsers must be installed once via
  `npx playwright install`.
- Accessibility is scanned with `@axe-core/playwright` (`AxeBuilder`).

## Linting / formatting

- **oxlint** (Rust-based, `.oxlintrc.json`). Enabled plugins: `typescript`,
  `oxc`, and `vue`; the `correctness` category is set to `error`. `ignorePatterns`
  excludes build/test output.
- **oxfmt** is the formatter (`.oxfmtrc.json`) It
  respects `.gitignore` plus the config's `ignorePatterns`.
- Run `npm run lint` / `npm run lint:fix` and `npm run format` /
  `npm run format:check`.
- **Note:** oxlint has no equivalent of `eslint-plugin-vuejs-accessibility`, so
  static a11y linting of Vue templates is no longer performed. Accessibility is
  still covered at runtime by the `@axe-core/playwright` e2e scan.
