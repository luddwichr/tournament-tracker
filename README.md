# WM 2026 Tracker

Offline-first PWA to track the FIFA World Cup 2026 results, standings and knockout bracket.

## Setup

Clone the repo, then either:

- **Devcontainer (recommended):** open the folder in VS Code with the
  [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
  extension installed and reopen in container — it builds an environment with the
  right Node, Python and Playwright versions already installed (see `.devcontainer/`).
- **Local:** install Node matching `.nvmrc` (also pinned via `engines` in
  `package.json`), then:

```sh
npm install
npm run dev
```

Login for Github CLI using Personal Access Token (for use by agentic tools - keep permissions low and readonly for most things):

- create token under https://github.com/settings/personal-access-tokens/
- write token to gh-token.txt

```sh
gh auth login --with-token < gh-token.txt
```

## Scripts

| Script                            | Purpose                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run dev`                     | Start the Vite dev server                                                                        |
| `npm run build`                   | Type-check and build for production                                                              |
| `npm run preview`                 | Serve the production build locally                                                               |
| `npm run typecheck`               | Type-check only — vue-tsc (TS 6) for the app, `tsc` (TS 7) for the Vue-free projects             |
| `npm run test:unit`               | Run unit tests (Vitest)                                                                          |
| `npm run test:unit:coverage`      | Run unit tests with coverage                                                                     |
| `npm run test:e2e`                | Run e2e tests against the dev server (Playwright)                                                |
| `npm run test:e2e:pwa`            | Run the offline/PWA e2e suite — needs `npm run build` first                                      |
| `npm run lint` / `lint:fix`       | Lint with eslint + oxlint                                                                        |
| `npm run format` / `format:check` | Format / check formatting with oxfmt                                                             |
| `npm run security`                | Scan for security issues with opengrep (registry rulesets + `.opengrep/rules.yml`)               |
| `npm run secrets`                 | Scan the full git history for committed credentials with gitleaks                                |
| `npm run check:code`              | Run typecheck, format:check, lint, test:unit:coverage, security and secrets — run before pushing |
| `npm run check:build`             | Run build, test:e2e, test:e2e:pwa and size — run this before pushing                             |
| `npm run size`                    | Check bundle size budgets (size-limit) — needs `npm run build` first                             |

## TypeScript 6 + 7 side-by-side

The `typescript` dependency is aliased to the TS 6 compatibility repackage
while TypeScript 7 is installed as `@typescript/native`, because
typescript-eslint and vue-tsc cannot use TS 7 until it ships a programmatic
API (expected in TS 7.1). `npm run typecheck` uses both: the real TS 7 (`tsc`)
checks the Vue-free projects (build config, e2e) and vue-tsc (TS 6) checks
everything that touches a `.vue` SFC. See
[`docs/typescript-7-side-by-side.md`](./docs/typescript-7-side-by-side.md)
for the tracking issues, the `scripts/vue-tsc6.mjs` workaround, and how to
unwind the setup once upstream support lands.

## Two Playwright configs

- `playwright.config.ts` — the regular e2e suite, run against the Vite **dev
  server** (`npm run test:e2e`).
- `playwright.pwa.config.ts` — the offline/PWA suite (`pwa-offline.spec.ts`),
  run against a **production build** served via `npm run preview`
  (`npm run test:e2e:pwa`). It needs a real build first because it exercises
  the built service worker, which doesn't exist under the dev server:

```sh
npm run build
npm run test:e2e:pwa
```

## Deployment

CI deploys to GitHub Pages on push to `main`. Because the site is served from
a `/<repo-name>/` subpath there, the deploy build sets `DEPLOY_BASE_PATH` (see
the "Build for deploy" step in `.github/workflows/ci.yml`), which
`vite.config.ts` reads into `base`. Reproduce it locally with
`DEPLOY_BASE_PATH=/<repo-name>/ npm run build`; a plain `npm run build` uses `/`.

## Domain rules

See [`REQUIREMENTS.md`](./REQUIREMENTS.md) and
[`docs/tournament-rules.md`](./docs/tournament-rules.md) for the tournament
format and product rules this app implements.
