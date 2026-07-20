# REVIEW.md — WM 2026 Tracker, full-app review (round 2)

Reviewed 2026-07-12 at commit `e4a238c`, superseding the 2026-07-06 review (commit `56037b5`).
Eight focused review passes (Vue, TypeScript, HTML/a11y, styling/UX, tests, setup/tooling,
engineering + AI-friendliness, functional/domain), each first re-verifying every prior finding
in its area against current code — classified **FIXED / STILL OPEN / OBSOLETE** in the
per-section status tables — before hunting for new findings, with emphasis on the code changed
since (`git diff 56037b5..HEAD`: shootout removal, invalidation guard, flag subset, npm/CI
hardening, TS6/7 side-by-side, CLAUDE.md deletion). Findings are ranked by impact within each
section; cross-cutting items live in their most natural section and are cross-referenced.

**Calibration up front:** the week since the last review was spent on _features and tooling_,
and spent well — the shootout removal (`d46bd91`) is a model feature deletion, `invalidation.ts`
closed the prior review's silent-re-attribution HIGH cleanly, the flag subset shipped with its
own regression test, and the npm/CI supply-chain hardening is layered and real. But it was not
spent on the _review findings_: of the ~75 prior findings re-checked, exactly **1 was fixed
outright** (the re-attribution guard), **~7 became obsolete** (almost all because the shootout
feature vanished), **~4 are partially addressed**, and the rest are still open at the same
lines — including three user-facing HIGHs (hamburger nav, flag-less score dialog,
abbreviation-wall standings).

_Status note:_ §4 (styling & UI/UX) and §5 (tests) have since been worked through and removed
from this document. The hamburger nav was kept deliberately — it is intuitive enough for this
app's readers, and a permanent tab bar costs too much of a phone screen — so `requirements.md`
was corrected to describe the burger instead of the bottom navigation it used to promise.

## Top findings (the ones to fix first)

| #   | Severity | Finding                                                                                                                                                 | Section   |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 8   | MEDIUM   | CLAUDE.md was deleted, its 2 rules genuinely automated — but the non-automatable turn-one content the prior review asked for was never written anywhere | §8.1      |
| 9   | MEDIUM   | `docs/requirements.md` still wrong in four places, plus one new drift (`/` redirect) added since the review that flagged it                             | §8.3/§9.1 |

The four styling/UX HIGHs that stood at the top of this list (safe-area/dvh, hamburger nav,
flag-less score dialog, abbreviation-wall standings) were addressed along with the rest of §4;
that section has been removed.

## What is genuinely good

Kept deliberately short and picky; per-section "genuinely good" blocks have the detail.

- **The shootout removal is executed with unusual end-to-end discipline** — one commit updates
  type, resolution semantics, form guard, ESPN mapping, and both docs; ~380 LOC of accidental
  complexity deleted with zero orphaned references (grep-verified). The two new HIGHs it caused
  are omissions around it, not defects in it.
- **`src/lib/invalidation.ts` is a model small domain algorithm** — pure single forward pass
  exploiting a tested ordering invariant, enforced in the store so no caller can forget, with a
  confirm dialog that shows exactly what the user is about to discard.
- **The test suite is genuinely strong:** 650 tests in ~14 s at 97.6 % stmt / 93.0 % branch,
  a persistence-contract e2e canary that keeps the fast localStorage-seeding shortcut honest,
  and a bidirectional flag-subset guard — regression classes most projects ship blind.
- **Supply-chain hardening is layered and real:** SHA-pinned actions, `npm audit signatures` in
  CI, registry pinned, `install-strategy=linked` killing phantom deps, `min-release-age`
  verified against npm's source.
- **`docs/typescript-7-side-by-side.md` is how to document a hack** — tracking issues, exact
  mechanics, editor trap warning, and a 4-step unwind checklist.
- **The a11y foundation is real engineering:** native `<dialog>` everywhere, a correct
  roving-tabindex tablist, documented workarounds for the modal-inert-live-region trap,
  reduced-motion honored globally and per-animation.
- **The design-token layer is a true single source of truth** — Material-spec state-layer
  opacities, a correctly-ordered dark palette with documented specificity rationale, and 44 px
  tap targets honored everywhere but one button.
- **The agent feedback loop is fast and correctly layered** (measured: `check:code` 20 s,
  typecheck 3.8 s, unit tests 13.2 s; stop hook → pre-push → CI split documented), and comment
  quality across the codebase is top-percentile why-comments with near-zero noise.

---

## 6. Setup & tooling

**Calibration.** This is top-percentile hobby-project tooling: SHA-pinned actions, provenance
verification, a hardened `.npmrc`, exact-version pinning end to end, and a genuinely exemplary
write-up of the TS6/7 workaround with an exit checklist. The tooling changes since `56037b5`
are almost all net improvements (npm-pin install + `npm audit signatures` in CI, the vue-tsc6
wrapper, a leaner pre-push). Very little here is wrong; what remains are budget/caching
mediums and small LOWs. Claims verified by
running `npm run lint`, `size-limit`, inspecting the built `dist/`, and reading npm's own
`min-release-age` definition.

### Genuinely good

- CI supply-chain hardening is layered and real: SHA-pinned actions (`ci.yml:20-67`), an
  `npm audit signatures` provenance/signature gate (`ci.yml:30-31`), the engines-pinned npm
  reinstalled before `npm ci` (`ci.yml:27-28`), and an `.npmrc` that pins the registry, blocks
  unreviewed install scripts, uses `install-strategy=linked` to kill phantom deps, and sets
  `min-release-age=1` — verified against npm's source that the unit is days, so the "24h"
  comment is accurate.
- `docs/typescript-7-side-by-side.md` is a model of how to document a hack: it names both
  blocking upstream issues, explains the exact repackage/alias mechanics, warns about the
  editor extension trap, and gives a 4-step unwind checklist. Rare to see a workaround ship
  with its own removal plan.
- The GH Pages SPA+PWA interplay is correct and each non-obvious step is commented:
  `public/404.html` re-encode → `index.html:17-26` decode → `vite.config.ts:46,53`
  (`navigateFallback: null` + `directoryIndex: null`) → `handlerDidError` shell fallback
  (`vite.config.ts:76-80`). Three separate traps, each solved and explained.
- Right gate split: `.githooks/pre-push` is just `npm run check:code` (fast:
  typecheck/format/lint/coverage parallelized via `run-p`), with the expensive build/e2e/size
  gate explicitly delegated to CI. Pre-push and CI share one command, so they cannot drift.
- `assetsInlineLimit: 0` (`vite.config.ts:128`) with its comment correctly keeps ~200 flag SVGs
  off the critical path — verified in `dist/assets/` (individually hashed `*.svg`,
  `TeamLabel-*.css` only 2.35 KB brotli).

### Findings

1. **[LOW] `vue-tsc6.mjs` reaches into the undocumented internal `@typescript/old` repackage
   artifact.** `scripts/vue-tsc6.mjs:26-27` — `realpathSync` +
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

## 7. General engineering

**Calibration.** The week's two headline changes are both net-positive: the invalidation guard
(`6b8165f`) is close to a model implementation of a cross-layer invariant, and the shootout
removal (`d46bd91`) deleted 328 lines and updated both docs in the same commit. The engineering
core remains unusually clean — `src/lib` still has zero Vue/Pinia imports (grep-verified) and
comments are overwhelmingly high-value why-comments. But almost every §7 finding from the
prior review that wasn't fixed _by deletion_ is still open.

### Genuinely good

- **`src/lib/invalidation.ts` is how to add a guard without scar tissue:** pure function,
  invariant enforced at the store write so "no caller can forget"
  (`src/stores/tournament.ts:22-31`), UI confirmation layered on top, a 136-line spec, and
  comments that justify the single forward pass by citing the data guarantee that makes it
  sound (`invalidation.ts:42-46`).
- **Prose conventions replaced by machines, done right:** exact-pin now enforced by `.npmrc:32`
  (`save-exact=true`) _and_ `renovate.json:4` (`rangeStrategy: "pin"`); phantom deps fail fast
  via `install-strategy=linked`; the flag-CSS size-limit entry (`package.json:81-85`) exists
  specifically to catch a re-import regression of the full flag catalog.
- **Comment quality is top-percentile.** Sampled broadly: `vite.config.ts:22-30` (why `prompt`
  not `autoUpdate`), `stores/tournament.ts:59-68` (rehydration trust boundary),
  `espn.ts:111-114` (why shootout goals are summed), `scripts/vue-tsc6.mjs:24-26` (why
  `realpathSync` under linked installs). Near-zero noise comments found.
- **Domain/UI separation held under change:** both big refactors landed without a single Vue
  import leaking into `src/lib` or store logic migrating into components.

### Findings

1. **[MEDIUM] The store's invariant comment overclaims: two of four write paths don't enforce
   it.** `src/stores/tournament.ts:22-26` says "the store never keeps a knockout result whose
   participants no longer match what it was entered for … no caller can forget" — true for
   `enterResult`/`clearResult`, false for `importResults` (`tournament.ts:48-52`) and
   `afterHydrate` (`tournament.ts:69-74`), which install unvalidated-for-consistency maps;
   `docs/requirements.md:383-387` (§9.8) documents this as a known loophole while the store
   comment claims the opposite. Either scope the comment honestly ("for interactive edits") or
   run a consistency sweep (drop knockout results whose refs don't resolve) in
   `importResults`/`afterHydrate`. (See also §9.3.)

2. **[MEDIUM] `results-sync` YAGNI surface survived the refactor and now produces
   `undefined`-warts at every call site.** `src/lib/results-sync/provider.ts:33-35` —
   `ResultsProvider.id`/`label` are still read nowhere, and both real callers of
   `syncResults(provider = defaultProvider, opts?)` now pass a literal `undefined` first
   argument (`use-results-sync.ts:37`, `use-match-result-form.ts:144`). `d46bd91` touched all
   four files and was the natural moment. Make it `syncResults(opts?)`, delete `id`/`label`;
   `FetchResultsOptions.fetchImpl` already covers test injection. (Details in §2.9.)

3. **[LOW] `useMatchResultForm` got a fifth concern instead of a split.**
   `src/composables/use-match-result-form.ts` (181 lines) now mixes form state, store writes,
   the pending-confirm state machine (lines 54-114), a11y announcements, and the live-fetch
   machine (lines 116-165) — the prior review's duplicate abort/status machinery vs
   `use-results-sync.ts` still stands. Extracting just the fetch block into a
   `useLiveResultFetch` would cut the file by a third and kill the duplication.

4. **[LOW] Small persisting coupling/comment debts, all one-line fixes.**
   (a) `use-origin-group-data.ts:13-16` still justifies its existence with a `max-lines` lint
   rule that exists in neither lint config — a false why-comment;
   (b) the same file hand-builds refKeys (`use-origin-group-data.ts:36-39`) that
   `bracket-graph.ts:4-8` (`r32RefKey`) already knows how to build — export it (§2.3);
   (c) `use-bracket-connectors.ts:22,33` still queries MatchCard's scoped `.match-card` class
   instead of a `data-` anchor attribute.

---

## 8. AI-friendliness / agentic coding

**Calibration.** The feedback loop itself is in genuinely good shape — measured on this
machine: `check:code` 20 s wall, typecheck 3.8 s, lint 3.0 s, unit tests 13.2 s — and the
stop-hook → pre-push → CI layering is correct. The regression risk is at the _context_ layer:
CLAUDE.md was deleted (`dbc5b76`, "only contains stuff that is automated now"), which is
accurate about what the file contained but leaves an agent's turn one with zero injected
context, and the non-automatable content the prior review asked for was never written.

### Genuinely good

- **The verification loop is agent-grade fast and layered correctly.** Stop hook
  (`.claude/hooks/check-ts-vue.sh`: silent auto-format, exit 2 + `asyncRewake` on failure),
  pre-push = `check:code` (20 s measured), CI owns the expensive `check:build` — and
  `.githooks/pre-push:2-4` documents exactly that split.
- **`docs/typescript-7-side-by-side.md` is exactly the right dependency note:** problem,
  tracking issues, and an explicit removal checklist — an agent can act on it without asking.

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

### Prior-findings status (§7 engineering + §8 AI-friendliness)

| Prior finding                                     | Status                 | Evidence                                                                                                                 |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| store must clear lib-internal caches              | STILL OPEN             | `tournament.ts:44-45,50-51` unchanged; two invalidator calls per bulk action                                             |
| `refKey` seam, two implementations                | STILL OPEN             | `use-origin-group-data.ts:36-39` vs `bracket-graph.ts:4-8`                                                               |
| bounded-cache eviction duplicated                 | STILL OPEN             | `standings.ts:74-79` ≡ `possible-teams.ts:155-161`                                                                       |
| results-sync unused `id`/`label` + provider param | STILL OPEN (worse)     | `provider.ts:33-35`; both callers now pass `syncResults(undefined, …)`                                                   |
| two hand-rolled fetch machines / mixed concerns   | STILL OPEN (worse)     | `use-match-result-form.ts` grew 140→181 lines, added a third state machine                                               |
| `.match-card` DOM coupling                        | STILL OPEN             | `use-bracket-connectors.ts:22,33`                                                                                        |
| misleading "lint line limit" comment              | STILL OPEN             | `use-origin-group-data.ts:13-16`; no `max-lines` rule in either lint config                                              |
| CLAUDE.md 10 lines, answers nothing (top #5)      | STILL OPEN (substance) | file deleted (`dbc5b76`); its 2 rules genuinely automated, but the missing turn-one content was never added anywhere     |
| requirements.md drift, 5+ places (top #6)         | PARTIALLY FIXED        | shootout + live-fetch reconciled in `d46bd91`, bottom-nav in the §4 pass; 4 errors remain + new `/`-redirect drift       |
| Stop-hook grep + allowlist gaps                   | STILL OPEN             | `check-ts-vue.sh:6` still ts/vue-only; `settings.json:9-16` allowlist unchanged incl. `npm run dev`                      |
| README `REQUIREMENTS.md` broken link              | STILL OPEN             | `README.md:73`                                                                                                           |
| no project verify/run skills                      | STILL OPEN             | `.claude/` contains only `hooks/`, `settings.json`                                                                       |
| lock-file hygiene + checked-in `acceptEdits`      | PARTIALLY FIXED        | lock ignored only via machine-local `.git/info/exclude`, not repo `.gitignore`; `defaultMode` still at `settings.json:8` |

---

## 9. Functional & domain quality

**Calibration.** The domain core (tiebreakers, third-place chain, Annex-C table, bracket
wiring) is untouched since the verified `56037b5` review and remains correct; fixture dates
line up with the real tournament calendar (group stage ends 2026-06-27, R32 Jun 28–Jul 3, R16
Jul 4–7, QF Jul 9–11, SF Jul 14/15, third-place Jul 18, final Jul 19 —
`src/data/fixtures-2026.ts:633-856`). The two big changes since then are both good
engineering: shootout removal (`d46bd91`) traded modelled complexity for a folding convention,
and invalidation (`6b8165f`) closed the old #1 HIGH cleanly. (The shootout follow-up — a
display-only shootout marker with per-side penalty goals, the `shootout-model` branch — later
closed this section's two shootout findings and the stale `tournament-rules.md` passage.)
Meanwhile nearly every audience-facing language/icon finding from the prior review is still
open, and `docs/requirements.md` was updated for the shootout change while leaving five
known-wrong claims in place.

### Genuinely good

- **The shootout removal is executed with unusual end-to-end discipline.** One commit
  (`d46bd91`) coherently updated the type (`src/types/tournament.ts:113-117`), resolution
  semantics (`knockout.ts:52`), the form guard (`use-match-result-form.ts:38,82`), the ESPN
  mapping (regulation + `shootoutScore` summed, `espn.ts:111-117`), and _both_ docs
  (`requirements.md:33-36,84-86,374-376`, `tournament-rules.md` scope note). ~380 LOC of
  accidental complexity deleted; the model now carries exactly what the bracket needs — a
  decisive score.
- **`invalidatedDownstream` is a model small domain algorithm.** Single forward pass exploiting
  bracket order (`src/lib/invalidation.ts:42-58`), cascade via deletion from the candidate map,
  "null is a distinct participant" handled explicitly (lines 16-19) — and the ordering
  invariant it relies on is itself tested (`src/data/data.spec.ts:109`).
- **The invariant is enforced in the store, not the UI.** `enterResult`/`clearResult` recompute
  and cascade-drop atomically (`src/stores/tournament.ts:22-40`), so no future caller can
  forget; the composable only decides whether to _ask_ first.
- **The confirm dialog shows the old attribution.** `invalidatedMatchLabel` resolves
  participants under _current_ results (`invalidation.ts:80-81`) — exactly what the user is
  about to discard, with a fallback instead of a throw for import-corrupted refs.
- **"Unentschieden geht nicht! Wer hat gewonnen?"** (`ScoreDialog.vue:57`) is genuinely
  child-register German — short words, direct question. The right voice.

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

3. **[LOW] `importResults` silently bypasses the invalidation invariant the store claims is
   unforgettable.** `src/stores/tournament.ts:22-26` says "the store never keeps a knockout
   result whose participants no longer match what it was entered for … no caller can forget",
   but `importResults` (`:48-52`) installs any validator-passing map wholesale — a hand-edited
   import (level M73 + stored M90, which `persistence.ts:80-105` accepts; it has no
   knockout-draw check) persists exactly such orphaned attributions. Either run one forward
   resolve-and-drop pass on import or scope the comment to `enterResult`/`clearResult`.
   (Same root cause as §7.2.)

4. **[LOW] A level knockout result without shootout goals still yields an empty possible-teams
   set — and the model makes the fix unambiguous.** `src/lib/possible-teams.ts:216-221`: an
   imported level knockout result short-circuits to exact resolution → `null` → "no team can
   fill this slot". A level score without shootout goals officially means "not decided yet"
   (`Result` in `types/tournament.ts`), so falling through to the home∪away union at `:222-230`
   is now clearly correct, not a judgment call.

5. **[LOW] The invalidation confirm dialog cites match numbers the UI never shows.**
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
