# Testing & linting

Pinned (exact) at scaffold time (2026-06-26):

| Package                             | Version  |
| ----------------------------------- | -------- |
| `vitest`                            | `4.1.9`  |
| `@vitest/coverage-v8`               | `4.1.9`  |
| `@vue/test-utils`                   | `2.4.11` |
| `jsdom`                             | `29.1.1` |
| `@playwright/test`                  | `1.61.1` |
| `@axe-core/playwright`              | `4.12.1` |
| `eslint`                            | `10.5.0` |
| `@eslint/js`                        | `10.0.1` |
| `eslint-plugin-vue`                 | `10.9.2` |
| `eslint-plugin-vuejs-accessibility` | `2.5.0`  |
| `@vue/eslint-config-typescript`     | `14.9.0` |
| `@vue/eslint-config-prettier`       | `10.2.0` |
| `typescript-eslint`                 | `8.62.0` |
| `prettier`                          | `3.8.5`  |

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

- **ESLint 10, flat config** (`eslint.config.js`). Flat config is the default in
  ESLint 9+/10; there is no `.eslintrc`. Built with
  `defineConfigWithVueTs` + `vueTsConfigs.recommended` from
  `@vue/eslint-config-typescript`, `eslint-plugin-vue` flat recommended,
  `eslint-plugin-vuejs-accessibility` flat recommended, and Prettier
  skip-formatting last.
- `globalIgnores(...)` (imported from `eslint/config`) excludes build/test
  output.
- Prettier config in `.prettierrc.json` (no semicolons, single quotes,
  printWidth 100, trailing commas). Run `npm run lint` and `npm run format`.
