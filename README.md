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

| Script                            | Purpose                                                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Start the Vite dev server                                                                                      |
| `npm run build`                   | Build for production (no type-check — run `typecheck` or `check:code` for that)                                |
| `npm run preview`                 | Serve the production build locally                                                                             |
| `npm run typecheck`               | Type-check only — vue-tsc (TS 6) for the app, `tsc` (TS 7) for the Vue-free projects                           |
| `npm run test:unit`               | Run unit tests (Vitest)                                                                                        |
| `npm run test:unit:coverage`      | Run unit tests with coverage                                                                                   |
| `npm run test:e2e`                | Run e2e tests against the production build (Playwright) — needs `npm run build` first                          |
| `npm run test:e2e:pwa`            | Run the offline/PWA e2e suite — needs `npm run build` first                                                    |
| `npm run lint` / `lint:fix`       | Lint with eslint + oxlint                                                                                      |
| `npm run lint:unused`             | Find unused files, exports and dependencies (knip)                                                             |
| `npm run format` / `format:check` | Format / check formatting with oxfmt                                                                           |
| `npm run scan:sast`               | Scan for security issues with opengrep (registry rulesets + `.opengrep/rules.yml`)                             |
| `npm run scan:secrets`            | Scan the full git history for committed credentials with gitleaks                                              |
| `npm run scan:workflows`          | Lint GitHub Actions workflows for security issues with zizmor                                                  |
| `npm run scan:licenses`           | Enforce the permissive-only license policy (trivy, see `trivy.yaml`)                                           |
| `npm run scan:deps`               | Scan dependencies for fixable HIGH/CRITICAL vulnerabilities (trivy)                                            |
| `npm run scan:dockerfile`         | Scan the devcontainer Dockerfile for misconfigurations (trivy)                                                 |
| `npm run scan:image`              | Scan the pinned Dockerfile base image for fixable OS CVEs (trivy)                                              |
| `npm run sbom`                    | Generate a CycloneDX SBOM into `sbom.cdx.json` (trivy)                                                         |
| `npm run check:code`              | Run typecheck, format:check, lint, lint:unused, test:unit:coverage and the `scan:*` gates — run before pushing |
| `npm run check:build`             | Run build, test:e2e, test:e2e:pwa and size — run this before pushing                                           |
| `npm run size`                    | Check bundle size budgets (size-limit) — needs `npm run build` first                                           |

## TypeScript 6 + 7 side-by-side

The `typescript` dependency is aliased to the TS 6 compatibility repackage
while TypeScript 7 is installed as `@typescript/native`, because
typescript-eslint and vue-tsc cannot use TS 7 until it ships a programmatic
API (expected in TS 7.1). `npm run typecheck` uses both: the real TS 7 (`tsc`)
checks the Vue-free projects (build config, e2e) and vue-tsc (TS 6) checks
everything that touches a `.vue` SFC. See
[`docs/typescript-7-side-by-side.md`](./docs/typescript-7-side-by-side.md)
for the tracking issues, the `scripts/vue-tsc6.js` workaround, and how to
unwind the setup once upstream support lands.

## Two Playwright configs

Both suites run against the **production build** served via `npm run preview`,
so tests exercise the app exactly as shipped (CSP meta tag, hashed es2025
chunks, minification). Both therefore need `npm run build` first
(`npm run check:build` does this in the right order).

- `playwright.config.ts` — the regular e2e suite (`npm run test:e2e`), run in
  parallel with the service worker blocked: the SW is covered by its own suite,
  and left registered it would take over fetches mid-test, bypassing
  `page.route()` interception.
- `playwright.pwa.config.ts` — the offline/PWA suite (`pwa-offline.spec.ts`),
  run serially (`npm run test:e2e:pwa`) because it exercises the built service
  worker and rewrites `dist/index.html` on disk mid-test.

```sh
npm run build
npm run test:e2e
npm run test:e2e:pwa
```

## Deployment

CI deploys to GitHub Pages on push to `main`. Because the site is served from
a `/<repo-name>/` subpath there, the deploy build sets `DEPLOY_BASE_PATH` (see
the "Build for deploy" step in `.github/workflows/ci.yml`), which
`vite.config.ts` reads into `base`. Reproduce it locally with
`DEPLOY_BASE_PATH=/<repo-name>/ npm run build`; a plain `npm run build` uses `/`.

## Domain rules

See [`docs/requirements.md`](./docs/requirements.md) and [`docs/tournament-rules.md`](./docs/tournament-rules.md) for the tournament
format and product rules this app implements.
The PWA Architecture is described in [`docs/pwa-architecture.md`](docs/pwa-architecture.md)
