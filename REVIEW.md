# REVIEW.md — WM 2026 Tracker, full-app review (round 2)

Reviewed 2026-07-12 at commit `e4a238c`, superseding the 2026-07-06 review (commit `56037b5`).
Eight focused review passes (Vue, TypeScript, HTML/a11y, styling/UX, tests, setup/tooling,
engineering + AI-friendliness, functional/domain), each first re-verifying every prior finding
in its area against current code — classified **FIXED / STILL OPEN / OBSOLETE** in the
per-section status tables — before hunting for new findings, with emphasis on the code changed
since (`git diff 56037b5..HEAD`: shootout removal, invalidation guard, flag subset, npm/CI
hardening, TS6/7 side-by-side, CLAUDE.md deletion). Findings are ranked by impact within each
section; cross-cutting items live in their most natural section and are cross-referenced.

_Status note:_ §4 (styling & UI/UX), §5 (tests) and §7 (general engineering) have since been
worked through and removed from this document. The hamburger nav was kept deliberately — it is
intuitive enough for this app's readers, and a permanent tab bar costs too much of a phone
screen — so `requirements.md` was corrected to describe the burger instead of the bottom
navigation it used to promise. The per-section "genuinely good" and "calibration" blocks were
dropped throughout, so what remains is the open findings.

## Top findings (the ones to fix first)

| #   | Severity | Finding                                                                                                                                                 | Section   |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 8   | MEDIUM   | CLAUDE.md was deleted, its 2 rules genuinely automated — but the non-automatable turn-one content the prior review asked for was never written anywhere | §8.1      |
| 9   | MEDIUM   | `docs/requirements.md` still wrong in four places, plus one new drift (`/` redirect) added since the review that flagged it                             | §8.3/§9.1 |

The four styling/UX HIGHs that stood at the top of this list (safe-area/dvh, hamburger nav,
flag-less score dialog, abbreviation-wall standings) were addressed along with the rest of §4;
that section has been removed.

---

## 6. Setup & tooling

### Findings

1. **[LOW] `vue-tsc6.js` reaches into the undocumented internal `@typescript/old` repackage
   artifact.** `scripts/vue-tsc6.js:26-27` — `realpathSync` +
   `require.resolve('@typescript/old/lib/tsc.js')` depends on Microsoft's internal repackage
   layout and on `install-strategy=linked` symlink shape. Thoroughly commented and currently
   works, but it is the single most fragile point in the toolchain; the doc's unwind checklist
   is the right mitigation. Watch it across TS/vue-tsc bumps.

### Prior-findings status

| Prior finding (§6)                | Status     | Evidence                                                         |
| --------------------------------- | ---------- | ---------------------------------------------------------------- |
| Manifest minimal                  | STILL OPEN | no screenshots/categories/shortcuts; apple-touch reuses icon-192 |
| Versioning invisible              | STILL OPEN | `package.json:3` still `0.1.0`, no CHANGELOG                     |
| ESPN dependency risk undocumented | STILL OPEN | no shape guard/monitoring beyond provider parsing                |

---

## 8. AI-friendliness / agentic coding

### Findings

1. **[MEDIUM] CLAUDE.md deletion: right call for what it contained, but the prior finding was
   about what it _didn't_ contain — and that gap is still open.** `dbc5b76` deleted a 10-line
   file whose two rules are now genuinely machine-enforced (`.npmrc:32` + `renovate.json:4`;
   `unicorn/no-array-sort` in `.oxlintrc.json:11`), so the deletion is consistent with "lint
   rules over prose" and not itself a regression. But an agent's turn one now injects
   _nothing_, and the non-automatable facts the prior review listed still live nowhere
   discoverable: the architecture map, `src/data/squads.ts`/`fifa-ranking.ts` being generated
   (warned only inside the files' headers), the Annex-C "never recompute by intuition" rule
   (only `docs/requirements.md:110`), how to run one test file, and the coverage trap in
   finding 2. A ~25-line CLAUDE.md containing _only_ non-automatable content (architecture
   line, generated-files warning, domain-doc pointers, single-test invocation, coverage-gate
   note) is the correct end state — deletion-plus-automation covered maybe a third of the
   prior finding.

2. **[MEDIUM] Stop hook and pre-push gate verify different things — an agent passes the hook,
   then fails the push.** `.claude/hooks/check-ts-vue.sh:6-7` — (a) the dirty-check greps only
   `[.](ts|vue)$`, so edits to `src/styles/flags.scss` skip the hook even though `a7143e2`
   added `src/styles/flags.spec.ts` specifically to guard that file; same for `.css`,
   `.oxlintrc.json`, `eslint.config.js`, `package.json`; (b) the hook runs `test:unit` (no
   coverage) while pre-push runs coverage-gated `check:code` with 95-96 % thresholds
   (`vite.config.ts:139-144`), so under-tested new code surfaces only at push time. Since
   `check:code` is just 20 s, make the hook `npm run format && npm run check:code` and broaden
   (or drop) the dirty-check — one gate, three places.

3. **[MEDIUM] `docs/requirements.md` drift: partially reconciled, the previously-flagged
   errors untouched — and one new drift added since.** Full list in §9.1; new since the review
   that flagged it: "`/` redirects to `/groups`" (`requirements.md:228`) vs the now-conditional
   redirect (`src/app/router.ts:10-15`). Agents reading this doc as spec inherit six wrong facts.
   Fix the six lines, then add the previously suggested "last reconciled at commit …" header so
   staleness is self-declaring.

4. **[LOW] Broken `REQUIREMENTS.md` link still shipping; the fix should be a machine check,
   not another manual pass.** `README.md:73` links `./REQUIREMENTS.md`; the file is
   `docs/requirements.md` — flagged in the prior review, still broken, and
   `persistence.spec.ts:52` still cites "REQUIREMENTS.md §9.8" by the wrong name. A
   lychee/markdown-link-check step in CI (or a small unit test resolving relative links in
   `*.md`) ends the whack-a-mole.

5. **[LOW] Checked-in `.claude/settings.json` still fights the agent it configures.**
   `.claude/settings.json:8-16` — `defaultMode: "acceptEdits"` imposes a per-user preference
   repo-wide; the allowlist still includes `Bash(npm run dev)` (hangs a foreground agent) but
   not the fast-iteration commands (`Bash(npx vitest run:*)`, `Bash(npm run check:code)`,
   `Bash(npm run format:check)`). Move `acceptEdits` to `settings.local.json`, swap the
   allowlist entries. Still no project skill — a `verify` skill wrapping `check:code` →
   `check:build`-when-needed is the obvious first one.

### Prior-findings status (engineering + AI-friendliness)

| Prior finding                                | Status                 | Evidence                                                                                                                 |
| -------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| store must clear lib-internal caches         | STILL OPEN             | `tournament.ts:44-45,50-51` unchanged; two invalidator calls per bulk action                                             |
| bounded-cache eviction duplicated            | STILL OPEN             | `standings.ts:74-79` ≡ `possible-teams.ts:155-161`                                                                       |
| two hand-rolled fetch machines               | STILL OPEN             | `use-live-result-fetch.ts` and `use-results-sync.ts` still duplicate abort/status handling                               |
| CLAUDE.md 10 lines, answers nothing (top #5) | STILL OPEN (substance) | file deleted (`dbc5b76`); its 2 rules genuinely automated, but the missing turn-one content was never added anywhere     |
| requirements.md drift, 5+ places (top #6)    | PARTIALLY FIXED        | shootout + live-fetch reconciled in `d46bd91`, bottom-nav in the §4 pass; 4 errors remain + new `/`-redirect drift       |
| Stop-hook grep + allowlist gaps              | STILL OPEN             | `check-ts-vue.sh:6` still ts/vue-only; `settings.json:9-16` allowlist unchanged incl. `npm run dev`                      |
| README `REQUIREMENTS.md` broken link         | STILL OPEN             | `README.md:73`                                                                                                           |
| no project verify/run skills                 | STILL OPEN             | `.claude/` contains only `hooks/`, `settings.json`                                                                       |
| lock-file hygiene + checked-in `acceptEdits` | PARTIALLY FIXED        | lock ignored only via machine-local `.git/info/exclude`, not repo `.gitignore`; `defaultMode` still at `settings.json:8` |

---

## 9. Functional & domain quality

### Findings

1. **[MEDIUM] `docs/requirements.md` was touched for the shootout change but the
   known-wrong claims survived (prior HIGH, selectively addressed).** Still claims
   `registerType: 'autoUpdate'` (`requirements.md:47,341` vs `vite.config.ts:25` `'prompt'`),
   `navigateFallback` to index.html (`:345` vs `vite.config.ts:46` `null`), theme
   `'light'|'dark'` default `'light'` (`:211,303` vs `settings.ts:4-9` `'system'`), §7.6
   (`:302-305`) still omits the shipped bulk "Ergebnisse abrufen" sync — plus the new `/`
   redirect drift (§8.3). (The fifth, "Bottom navigation" vs the actual burger, was corrected
   when §4 was worked through.) `d46bd91` proves the team _can_ keep this doc current; do one
   reconciliation pass and add a "last reconciled at commit" header.

2. **[MEDIUM] Bulk sync is still wholesale-destructive, and its success message overstates.**
   `src/views/SettingsView.vue:21,111` replaces the entire store via `importResults`; matches
   the feed misses or that fail ref-resolution are silently dropped
   (`results-sync/index.ts:53` `continue`), destroying manual entries. New since `56037b5`:
   consent is now explicit ("Abrufen & ersetzen", `SyncDialog.vue:59,76`) — good — but "N
   Spiele wurden aktualisiert" (`SyncDialog.vue:37`) reports `Object.keys(results).length`
   (`use-results-sync.ts:40`), the fetched-map size, not what changed or what was lost. Merge
   by matchId and report a real delta.

3. **[LOW] A level knockout result without shootout goals still yields an empty possible-teams
   set — and the model makes the fix unambiguous.** `src/lib/possible-teams.ts:216-221`: an
   imported level knockout result short-circuits to exact resolution → `null` → "no team can
   fill this slot". A level score without shootout goals officially means "not decided yet"
   (`Result` in `types/tournament.ts`), so falling through to the home∪away union at `:222-230`
   is now clearly correct, not a judgment call.

4. **[LOW] The invalidation confirm dialog cites match numbers the UI never shows.**
   `invalidatedMatchLabel` produces "Achtelfinale (Spiel 89): …" (`invalidation.ts:83`) and
   `bracket-labels.ts:22-25` says "Sieger Sp. 73", but no card anywhere renders its match
   number — the reader can't locate "Spiel 89". Team names save the confirm dialog, but
   printing `match.id` on bracket cards would fix both at once.

### Prior-findings status

| Prior finding (§9 + cross-ref)                     | Status                     | Evidence                                                                            |
| -------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| group edit silently re-attributes knockout results | **FIXED**                  | `invalidation.ts` + atomic cascade in `tournament.ts:27-40` + confirm flow          |
| destructive whole-tournament sync                  | STILL OPEN (consent added) | `SettingsView.vue:21` wholesale replace; "Abrufen & ersetzen" is new, but no merge  |
| double-layer standings caching                     | STILL OPEN                 | `standings.ts:55,74` module cache + store computed `tournament.ts:18-20`            |
| 1M-combo synchronous budget                        | STILL OPEN                 | `possible-teams.ts:55` `MAX_ENUMERATION_COMBOS = 1_000_000`                         |
| empty set for level knockout result                | STILL OPEN                 | `possible-teams.ts:216-221` (now cheaper to justify fixing)                         |
| dead `TeamStat.form`                               | STILL OPEN                 | `standings.ts:27,104,133-148`, never rendered                                       |
| "K.-o.-Runde" / "Sieger Sp. 73" / "Bosnien H."     | STILL OPEN                 | `router.ts:27`, `bracket-labels.ts:22-25`, `teams.ts:26`                            |
| no "Heute" entry point, no champion payoff         | STILL OPEN                 | `grep -rn "Heute\|Weltmeister" src/` (views/components) returns nothing             |
| requirements.md drift, 5 places (top #6)           | PARTIALLY FIXED            | shootout + bottom-nav rewritten; autoUpdate/navigateFallback/theme/§7.6 still wrong |
