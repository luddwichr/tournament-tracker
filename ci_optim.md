# CI Optimization Plan

Source: inspection of recent CI runs (2026-07-13), primarily
[29244988976](https://github.com/luddwichr/tournament-tracker/actions/runs/29244988976) (failed),
[29244504384](https://github.com/luddwichr/tournament-tracker/actions/runs/29244504384),
[29243518411](https://github.com/luddwichr/tournament-tracker/actions/runs/29243518411),
[29244481401](https://github.com/luddwichr/tournament-tracker/actions/runs/29244481401) (cancelled on main).

Reference timings from run 29244504384 (total ~4.5 min):
`check:build` 107s, `check:code` 46s, `playwright install-deps` 38s,
`npm audit signatures` 26s, `npm ci` 10s.

## 1. ✅ opengrep install fails on GitHub API rate limit (caused run 29244988976 to fail)

`install.sh` lists releases via the unauthenticated GitHub API only to validate an
already-pinned version; shared runners regularly hit the 60 req/h/IP limit
("Failed to fetch available versions from GitHub").

**Fix:** download the pinned release binary directly from the deterministic
`releases/download/v<version>/opengrep_manylinux_x86` URL with `--retry`.
Done in commit `328af0f`.

## 2. Devcontainer Dockerfile uses the same fragile install.sh

`.devcontainer/Dockerfile:91` pipes the same `install.sh`, so container builds can
fail on the same rate limit (and it warns "cosign … not installed. Skipping
signature validation" on every build).

**Fix:** switch to the same direct-download pattern as CI (comment in both files
already demands they stay in sync).

## 3. No integrity verification of the opengrep binary

The installer's signature verification was always skipped in CI (cosign not
installed), and the new direct download doesn't verify either. A compromised
release asset would run with repo read access.

**Fix:** pin the release asset's SHA-256 next to `OPENGREP_VERSION` and verify with
`sha256sum -c` in both the CI step and the Dockerfile.

## 4. `playwright install-deps` runs a full apt update/install every run (~38s)

It runs unconditionally and installs system deps for *all* browsers, even though
only chromium is used and the browser cache hit.

**Fix:** `npx playwright install-deps chromium` to limit the package set. (The step
must stay unconditional — system libs aren't part of the `~/.cache/ms-playwright`
cache — but chromium-only shrinks the apt transaction.)

## 5. Triple typecheck / double vite build on main pushes

- `check:code` runs `typecheck` (1st).
- `check:build` runs `npm run build` = `typecheck && vite build` (2nd).
- "Build for deploy" runs `npm run build` again = `typecheck` (3rd) + `vite build` (2nd),
  only to change `DEPLOY_BASE_PATH`.

**Fix:** add a `build:only` script (`vite build`) and use it in the "Build for
deploy" step; typechecking already gates the run twice by that point. (Optionally
also use it inside `check:build` in CI, but that changes local semantics — keep
scope small first.)

## 6. `cancel-in-progress: true` also cancels main builds → deploys can be skipped

Run 29244481401 (push to main, "Hide decorative emoji…") was cancelled by the
following push. If the newer run had then failed before deploy, Pages would have
stayed stale with no successful deploy for either commit.

**Fix:** `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` so PR runs
still cancel but main runs queue.

## 7. Flaky e2e test with no debugging artifacts

`e2e/export-import.spec.ts:53` ("export → Zurücksetzen → Importieren restores
state", mobile-chrome) was flaky in run 29243518411 — `emptyMatchButton('Mexiko',
'Südafrika')` not visible within 5s after reset + goto; passed on retry. Traces and
the HTML report are discarded, so flakes/failures can't be diagnosed after the fact.

**Fix (two parts):**
1. Upload `playwright-report/` + `test-results/` as an artifact with
   `if: failure()` (and consider `!cancelled()` to also capture flaky retries).
2. Investigate the flake itself: the assertion races the post-reset re-render;
   check whether reset state propagation needs an explicit await in the page
   object / test.

## 8. Playwright browser cache invalidated by any dependency change

Cache key is `playwright-${{ hashFiles('package-lock.json') }}`, so every
unrelated dep bump re-downloads chromium (~1 min penalty on those runs).

**Fix:** key on the Playwright version instead, e.g. derive
`node -p "require('@playwright/test/package.json').version"` into the key.

## 9. Deprecation warnings during `npm ci` (transitive, low priority)

- `glob@10.5.0` via `@vue/test-utils → js-beautify`
- `glob@11.1.0` + `source-map@0.8.0-beta.0` via `vite-plugin-pwa → workbox-build`

Not fixable directly; either wait for upstream releases (Renovate will pick them
up) or silence via `overrides` if the noise matters. **Recommendation: leave as-is,
re-check after next Renovate cycle.**

## 10. Not issues (checked, no action)

- `actions/checkout` "hint: Using 'master'…" lines are stock git-init advice, harmless.
- `npm audit signatures` (26s) is worthwhile supply-chain checking; keep.
- Node/npm caches hit reliably (`setup-node` cache restored in all inspected runs).
- The separate "pages build and deployment" runs are GitHub's automatic follow-up
  to the gh-pages branch push by peaceiris/actions-gh-pages; expected with this
  deploy method.
