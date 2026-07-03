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

## Scripts

| Script                            | Purpose                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev`                     | Start the Vite dev server                                                          |
| `npm run build`                   | Type-check and build for production                                                |
| `npm run preview`                 | Serve the production build locally                                                 |
| `npm run typecheck`               | Type-check only (`vue-tsc`)                                                        |
| `npm run test:unit`               | Run unit tests (Vitest)                                                            |
| `npm run test:unit:coverage`      | Run unit tests with coverage                                                       |
| `npm run test:e2e`                | Run e2e tests against the dev server (Playwright)                                  |
| `npm run test:e2e:pwa`            | Run the offline/PWA e2e suite — needs `npm run build` first                        |
| `npm run lint` / `lint:fix`       | Lint with eslint + oxlint                                                          |
| `npm run format` / `format:check` | Format / check formatting with oxfmt                                               |
| `npm run check`                   | Run typecheck, format:check, lint and test:unit:coverage — run this before pushing |
| `npm run size`                    | Check bundle size budgets (size-limit) — needs `npm run build` first               |

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
