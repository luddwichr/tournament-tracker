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
abbreviation-wall standings). And the shootout simplification, clean as
the code is, introduced the two most urgent new findings itself: persisted v1 data silently
changed meaning with no migration, and the folding convention is invisible in the product —
one week before the final.

## Top findings (the ones to fix first)

| #   | Severity | Finding                                                                                                                                                                                    | Section   |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| 1   | HIGH     | **NEW:** Shootout removal changed the meaning of persisted data with no migration — `SCHEMA_VERSION` still 1, legacy `shootoutWinner` entries silently regress live users' brackets        | §7.1      |
| 2   | HIGH     | **NEW:** A shootout result can be neither entered nor read faithfully — the folding rule exists only in docs, ESPN sync writes unmarked synthetic scores, and the semifinals are Jul 14/15 | §9.1      |
| 3   | HIGH     | Mobile navigation still hides all four views behind a hamburger — unusable for the pre-reader audience; the requirements specify a bottom tab bar (carried over)                           | §4.2      |
| 4   | HIGH     | The score-entry dialog still identifies teams by muted text only — no flags, on the one screen where a child acts (carried over)                                                           | §4.3      |
| 5   | HIGH     | Standings tables still communicate through bare abbreviations (`Sp`, `U`, `TD`, `Pkt`) with hover-only expansion (carried over)                                                            | §4.4      |
| 6   | HIGH     | Still no `safe-area-inset-*` anywhere and `100vh` instead of `dvh` — visible defects in the installed PWA (carried over)                                                                   | §4.1      |
| 7   | HIGH     | 12 focusable standings scroll regions still have no accessible name; group letter and rank still `aria-hidden` without substitute (carried over)                                           | §3.1      |
| 8   | HIGH     | The `MatchCardMeta` toggle is still a ~20 px tap target (carried over)                                                                                                                     | §3.3      |
| 9   | MEDIUM   | CLAUDE.md was deleted, its 2 rules genuinely automated — but the non-automatable turn-one content the prior review asked for was never written anywhere                                    | §8.1      |
| 10  | MEDIUM   | `docs/requirements.md` still wrong in the same five places, plus one new drift (`/` redirect) added since the review that flagged it                                                       | §8.3/§9.3 |

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

## 1. Vue components

**Calibration.** Every component/view/composable touched by the prior review was re-read and
diffed against `56037b5..HEAD`. The shootout removal genuinely deleted the two shootout-specific
findings, and ScoreDialog/`use-match-result-form` were substantially rewritten around the new
invalidation-confirm flow — but that rewrite left every _structural_ Vue finding from the prior
pass untouched (continuation-passing `close`, the side-effect ternary, the snapshot
`isPastKickoff` all survived verbatim). This is a codebase that refactors features cleanly but
hasn't paid down the component-level ergonomics debt. Most findings below are maintainability,
not user-facing bugs, and are ranked accordingly.

### Genuinely good

- `defineModel` is used idiomatically and consistently for two-way state: named models in
  `ScoreInput.vue:10-11` / `DisciplineInput`, `required: true` scalar in `StepperInput.vue:13`.
  No `props`+`emit('update:...')` boilerplate anywhere.
- The native-`<dialog>` + `defineExpose({ close })` pattern in `BaseDialog.vue:29-33` is a clean
  single seam; consumers get `showModal()`/top-layer/`::backdrop`/Escape for free with zero
  focus-trap library.
- `MatchCardMeta.vue:1-9` correctly hoists the `Intl.DateTimeFormat` into a plain `<script>`
  module block — the exact pattern the rest of the app should copy for its per-instance lookup
  tables.
- The new `fetch: reactive({ status, error, message, run })` grouping
  (`use-match-result-form.ts:179`) collapses four separate returns into one cohesive object the
  template reads as `fetch.status`/`fetch.run` — a real readability win over the prior flat
  destructure.
- Typed `defineEmits<{...}>()` with tuple payloads is applied uniformly across every emitting
  component (e.g. `BracketRound.vue:23-29`, `MatchCard.vue:21-25`) — no stringly-typed emit
  escapes.

### Findings

1. **[MEDIUM] Triplicated stat-table header markup, ~90 lines of copy-paste.**
   `GroupStandingsTable.vue:24-56`, `TeamStats.vue:14-46`, `ThirdPlaceTable.vue:48-69` — each
   `<th><abbr title="…">Sp</abbr><span class="visually-hidden">Spiele</span></th>` block is
   hand-written (9 visually-hidden spans in TeamStats, 6 abbr in ThirdPlaceTable). A `v-for`
   over a `{ abbr, label }[]` column-def array per table removes the duplication and shrinks
   GroupStandingsTable from 99 to ~55 lines. Unchanged since the prior review.

2. **[MEDIUM] The StepperInput a11y label is inferred from a longest-common-prefix hack.**
   `StepperInput.vue:18-23` derives `valueLabel` by walking the shared character prefix of
   `decLabel`/`incLabel`. It happens to work only because every current caller formats
   `` `Tor für ${name} abziehen/hinzufügen` ``; the first caller whose labels don't share a
   lead-in silently gets a truncated or fallback spin-button name, which the pre-reader-audience
   screen-reader path depends on. Make it structural: pass an explicit `valueLabel` prop (or a
   `{ noun }` and derive all three strings from it).

3. **[MEDIUM] Knockout click path resolves both teams a second time through a 3-hop emit
   chain.** `KnockoutView.vue:11-16` runs `resolveTeamRef` for home and away again, although
   `BracketView.toRow` (`BracketView.vue:23-24`) already resolved and holds both
   `homeTeam`/`awayTeam` on every `MatchRow`. The click travels
   MatchCard→BracketRound→BracketView→KnockoutView only to re-derive data one hop away already
   had — while `GroupTable.vue:27-31` calls the injected `useScoreDialog()` with zero hops. Let
   BracketView open the dialog from its own rows; KnockoutView becomes a layout shell.

4. **[MEDIUM] `withDefaults(defineProps…)` everywhere despite Vue 3.5.** `BaseDialog.vue:5-17`,
   `MatchCardMeta.vue:15-22`, `StepperInput.vue:4-11` still use the pre-3.5 wrapper and read
   `props.x` in script. `const { showCloseButton = true, maxWidth } = defineProps<{…}>()` is the
   3.5 idiom. Worst case is `MatchCardMeta.vue:21` — `withDefaults(…, { static: false })`
   defaults an optional boolean to `false`, a no-op; the wrapper buys nothing.

5. **[LOW] Continuation-passing `save(close)` / `clear(close)` / `confirmPending(close)` is
   needless indirection, now threaded through three functions.**
   `use-match-result-form.ts:69-110`, called from `ScoreDialog.vue:90,97,109`. The composable
   owns the data; the component owns its dialog lifecycle. Have `save()`/`clear()` return a
   boolean (or `'saved' | 'pending'`) and let the component decide whether to `close()`. The
   rewrite added a third `close`-taking function rather than removing the pattern.

6. **[LOW] Side-effect assignment buried in a template ternary.** `ScoreDialog.vue:97` —
   `@click="knockoutDraw ? (attemptedDrawSave = true) : save(close)"`. Extract a `handleSave()`
   so the branch is greppable and unit-testable. Related nit: line 94's cancel button calls
   `baseDialog?.close()` directly while lines 90/97 use the local `close` helper — pick one
   within the file.

7. **[LOW] Immutable lookup tables recreated per instance instead of at module scope.**
   `StandingsRow.vue:26-33` (`statusLabel`) mounts 48× on the groups page;
   `ThirdPlaceRow.vue:24-29`, `SyncDialog.vue:17-23` (`TITLES`) do the same.
   `MatchCardMeta.vue:1-9` already shows the fix (plain `<script>` block). StandingsRow is the
   one where the 48× churn is measurable.

8. **[LOW] `static` prop name is a strict-mode reserved word.** `MatchCard.vue:18`,
   `MatchCardMeta.vue:19`. The moment anyone adopts props destructure (finding 4),
   `const { static } = defineProps…` is a syntax error; it also under-describes intent. Rename
   to `plain` or invert to `interactive`.

9. **[LOW] Three coexisting prop-declaration styles.** Bare `defineProps` (most files),
   `const props = defineProps` even when the value is only read in the template
   (`TeamFlag.vue:5` → `props.size` at line 12; `icons/CardIcon.vue:2` → `props.color` at lines
   8/10), and `withDefaults`. `TeamLabel.vue:6` legitimately needs `const props` (script
   access), TeamFlag/CardIcon do not. Standardize.

10. **[LOW] `announce` is the one provide/inject pair not packaged in its composable.**
    `use-team-viewer.ts` and `use-score-dialog.ts` each export both `provideX()` and `useX()`;
    `use-announce.ts:1-8` exports only `useAnnounce`, so App.vue hand-rolls the provider inline
    (`App.vue:36-46`). A `provideAnnounce()` restores symmetry and removes ~10 lines from
    App.vue.

11. **[LOW] Four names for "close this dialog," all `baseDialog.value?.close()`.** `dismiss`
    (`UpdateDialog.vue:14`), `requestClose` (`SyncDialog.vue:43`), `close`
    (`ScoreDialog.vue:19`), `handleCancel` (`ConfirmDialog.vue:25`). Pick one.

12. **[LOW] `cancel` emitted for non-cancellation closes.** `SyncDialog.vue:55` maps `@close` →
    `emit('cancel')`, so pressing "Schließen" in the `done` state (line 83) fires `cancel` →
    `cancelSync()`, "aborting" a completed request. Name the event `close`.

13. **[LOW] Redundant `<Teleport to="body">` around a native `<dialog>`.**
    `BracketView.vue:126-133`. `showModal()` renders in the top layer regardless of DOM
    position, and no other BaseDialog consumer teleports. Drop it.

14. **[LOW] Score-dialog config prop names drift from the component's.**
    `use-score-dialog.ts:6-8` uses `home`/`away`; `ScoreDialog.vue:12-13` uses
    `homeTeam`/`awayTeam`; App.vue manually re-maps (`:home-team="scoreDialogConfig.home"`,
    `App.vue:79-80`). Align the names so the call site collapses toward `v-bind`.

15. **[LOW] Inline conditional-spread style object in template.** `BaseDialog.vue:41-44` builds
    `{ '--dialog-max-width': …, ...(maxHeight ? {…} : {}) }` inline; a `computed dialogStyle`
    reads better and is testable.

### Prior-findings status

| Prior finding (§1 Vue)                     | Status     | Evidence                                                                                      |
| ------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------- |
| Triplicated table headers                  | STILL OPEN | `GroupStandingsTable.vue:24-56`, `TeamStats.vue:14-46`, `ThirdPlaceTable.vue:48-69` unchanged |
| Knockout double-resolve, 3-hop chain       | STILL OPEN | `KnockoutView.vue:12-16` re-runs `resolveTeamRef`; `BracketView.vue:23-24` already resolved   |
| `save(close)`/`clear(close)` CPS           | STILL OPEN | now 3 fns take `close`: `use-match-result-form.ts:69,81,104`                                  |
| Side-effect ternary in template            | STILL OPEN | `ScoreDialog.vue:97`                                                                          |
| Redundant Teleport around `<dialog>`       | STILL OPEN | `BracketView.vue:126-133`                                                                     |
| Composable extracted for lint limit        | STILL OPEN | `use-origin-group-data.ts` confessional comment persists (see §7)                             |
| `withDefaults` / no reactive destructure   | STILL OPEN | `BaseDialog.vue:5-17`, `MatchCardMeta.vue:15-22`, `StepperInput.vue:4-11`                     |
| Common-prefix label hack                   | STILL OPEN | `StepperInput.vue:18-23`                                                                      |
| Snapshot `isPastKickoff`                   | STILL OPEN | `ScoreDialog.vue:43`                                                                          |
| Inline conditional-spread style            | STILL OPEN | `BaseDialog.vue:41-44`                                                                        |
| Per-instance constant tables               | STILL OPEN | `StandingsRow.vue:26-33`, `ThirdPlaceRow.vue:24-29`, `SyncDialog.vue:17-23`                   |
| Three prop-declaration styles              | STILL OPEN | `TeamFlag.vue:5`, `icons/CardIcon.vue:2` vs bare vs `withDefaults`                            |
| `announce` breaks provide/inject packaging | STILL OPEN | `App.vue:38-46` inline provider; no `provideAnnounce`                                         |
| `static` reserved-word prop                | STILL OPEN | `MatchCard.vue:18`, `MatchCardMeta.vue:19`                                                    |
| Four names for "close"                     | STILL OPEN | `UpdateDialog.vue:14`/`SyncDialog.vue:43`/`ScoreDialog.vue:19`/`ConfirmDialog.vue:25`         |
| Redundant `max-width` default              | STILL OPEN | `ConfirmDialog.vue:43`, `SyncDialog.vue:53`, `PossibleTeamsDialog.vue:17`                     |
| `cancel` fired for non-cancel closes       | STILL OPEN | `SyncDialog.vue:55` `@close="emit('cancel')"`, done state line 83                             |
| Config prop-name drift home/away           | STILL OPEN | `use-score-dialog.ts:6-8` vs `ScoreDialog.vue:12-13`, remap `App.vue:79-80`                   |
| Doubled BEM classes                        | STILL OPEN | `StandingsRow.vue:62-83`, `ThirdPlaceRow.vue:64-70`                                           |

---

## 2. TypeScript

**Calibration.** This slice (~2,500 LOC across `src/lib`, `src/data`, `src/types`,
`src/stores`, `results-sync`, e2e support) was already near the top of the quality curve six
days ago. The shootout-removal refactor is a genuinely clean deletion — no orphaned branches,
no stale comments left pointing at removed fields — and `invalidation.ts` is a well-scoped new
module. Almost every item flagged in the prior TypeScript pass is still present verbatim
(mostly untouched files), because this diff was a feature removal + one new module, not a
cleanup pass; every one was re-verified against current line numbers rather than trusted from
the old report.

### Genuinely good

- **The shootout-removal refactor is a model deletion, not a half-finished one.**
  `src/lib/knockout.ts:41-57`, `src/lib/team-schedule.ts:73-88`,
  `src/lib/results-sync/providers/espn.ts:111-117` — the `DecisiveGoals`/`shootoutWinner`
  branch logic collapsed into a single `finalGoals()` summation and a plain
  `if (level) return null`, with comments rewritten (not just deleted) to match. No dead
  `shootoutWinner` references remain anywhere in `src/` (grep-verified).
- **`src/lib/invalidation.ts` is well-designed new code.** Discriminated forward pass over
  `knockoutMatches` (already bracket-ordered), a `resolvedTeamId` helper that turns
  "unresolved" into a distinct `null` sentinel rather than overloading falsy, and a
  performance-note comment that states the actual bound (32 matches) instead of hand-waving.
- **`src/data/teams.ts:69`'s `as const satisfies readonly Team[]` is textbook modern TS**, and
  `src/data/fixtures-2026.ts:40`'s `as const satisfies Readonly<Record<ThirdPlaceSlot, GroupId>>`
  repeats the pattern correctly for a different shape — literal narrowing preserved, structural
  conformance checked, no separate annotation fighting the `as const`.
- **`assertNever` exhaustiveness is applied consistently** across `knockout.ts:59-61`,
  `possible-teams.ts:233-235`, and `bracket-labels.ts:28-30` — same signature, same `context`
  string convention, every `TeamRef.kind` switch genuinely exhaustive.
- **`squadFor`'s deliberate type-widening cast is documented, not accidental.**
  `src/data/squads.ts:1356-1362` explains exactly why `TeamId` (narrow) isn't usable at the
  call site and why widening to `string` is the honest choice — the kind of cast comment that
  should exist everywhere a cast does.

### Findings

1. **[MEDIUM] Bounded-FIFO-cache boilerplate duplicated byte-for-byte, comment included.**
   `src/lib/standings.ts:55-82` and `src/lib/possible-teams.ts:70-85,155-162` — identical
   `MAX_CACHE_SIZE`/`Map` FIFO-eviction blocks with the same "a `Map` preserves insertion
   order" comment, plus two separately-named clear functions (`clearStandingsCache`,
   `freePossibleTeamsMemory`) the store must remember to call together
   (`src/stores/tournament.ts:44-45,50-51`). A `boundedCache<K, V>(max)` helper in a shared
   module deletes ~25 lines and removes one of the two footguns for `reset()`/`importResults()`.

2. **[MEDIUM] `qualifyingAllocation` forces `resolveThirdPlaceSlot` to invert its own map.**
   `src/lib/third-place.ts:77-89,104-116` — `qualifyingAllocation` builds
   `Map<GroupId, ThirdPlaceSlot>`, then `resolveThirdPlaceSlot` immediately does
   `[...map].find(([, s]) => s === slot)` (line 112) to get back to a direct lookup. Return
   `THIRD_PLACE_ALLOCATION[qualifyingGroups]` (keyed by `ThirdPlaceHostGroup`) directly and
   index it with `THIRD_PLACE_SLOT_HOST[slot]` — no intermediate map, no scan.

3. **[MEDIUM] `refKey` string format hand-duplicated with no shared type or builder.**
   `src/lib/bracket-graph.ts:5-6` mints `` `groupRank:${group}:${rank}` `` /
   `` `thirdPlace:${slot}` `` via `r32RefKey`; `src/composables/use-origin-group-data.ts:37-39`
   independently hand-builds the identical strings. The two meet only in the DOM
   (`data-ref-key`), so a format drift compiles clean and fails silently at runtime. A
   template-literal type
   `` type RefKey = `groupRank:${GroupId}:${1 | 2}` | `thirdPlace:${ThirdPlaceSlot}` `` exported
   from `bracket-graph.ts`, plus a `refKeyFor(ref)` builder both modules call, turns the seam
   into a compile-time contract.

4. **[MEDIUM] Feeder-kind predicate written out four times; the two inverse maps built
   independently.** `src/lib/bracket-graph.ts:13,18,31,32` —
   `kind === 'matchWinner' || kind === 'matchLoser'` appears at all four lines; `nextMatchMap`
   (10-25) and `prevMatchMap` (27-36) are separate passes over `knockoutMatches` computing
   inverse relations of each other. One `feederMatchId(ref): string | null` helper plus deriving
   one map from the other removes both duplications in one pass.

5. **[LOW] `toThirdPlaceKey` takes a mutable `GroupId[]` where every other lib function takes
   `readonly`.** `src/types/tournament.ts:59` — it calls `.toSorted()` (non-mutating), so
   `readonly GroupId[]` costs nothing and matches the module's readonly discipline.

6. **[LOW] `context.store as unknown as {…}` double cast for a single-method need.**
   `src/stores/tournament.ts:70` — `isValidResultsMap` already accepts `unknown`, so only the
   `.reset()` call needs a typed shape: `(context.store as { reset: () => void }).reset()`.

7. **[LOW] `possibleTeamsFor` returns `Set<Team>` although its only caller spreads it
   immediately.** `src/lib/possible-teams.ts:247-255` — dedup already happens on `id` inside
   `possibleTeamIdsFor`; return `readonly Team[]`.

8. **[LOW] `isValidResult` is two six-way boolean walls with repeated `as number` casts.**
   `src/lib/persistence.ts:83-103` — a single
   `(['homeGoals', …] as const).every((k) => typeof r[k] === 'number' && isNonNegativeInteger(r[k] as number))`
   loop removes both walls and all six casts; also collapses `isNonNegativeInteger`'s redundant
   `Number.isFinite` next to `Number.isInteger`.

9. **[LOW] `syncResults`'s `provider` parameter is dead surface forcing `undefined` at both
   call sites.** `src/lib/results-sync/index.ts:77-83` — both real callers
   (`use-match-result-form.ts:144`, `use-results-sync.ts:37`) write
   `syncResults(undefined, { signal })`. `ResultsProvider.id`/`label`
   (`results-sync/provider.ts:33-35`) are likewise read nowhere (grep-verified). Drop the
   parameter and the two fields until a second provider actually needs them (YAGNI); tests
   already have `FetchResultsOptions.fetchImpl` as an injection seam. (Cross-referenced in
   §7.3.)

10. **[LOW] German label helpers split across two modules with no ownership rule.**
    `src/lib/team-schedule.ts:6-13` carries `KNOCKOUT_STAGE_LABEL` while
    `src/lib/bracket-labels.ts` owns `teamRefLabel`. Both are pure label lookups keyed off the
    same domain types; consolidating removes one file boundary a new contributor has to guess
    at.

11. **[LOW] `RankingEntry` is mutable and annotation-typed while `Team` next door is
    `readonly` + `satisfies`.** `src/data/fifa-ranking.ts:18-27` declares mutable fields, then
    types the array `readonly RankingEntry[] = [...] as const` — an explicit annotation layered
    on top of `as const`, rather than `teams.ts:69`'s `as const satisfies readonly Team[]`.
    Align both data modules on one convention.

### Prior-findings status

| Prior finding (§2 TS)                  | Status     | Evidence                                                        |
| -------------------------------------- | ---------- | --------------------------------------------------------------- |
| `qualifyingAllocation` inversion       | STILL OPEN | `third-place.ts:112` unchanged                                  |
| bounded-cache duplication              | STILL OPEN | `standings.ts:55-82`, `possible-teams.ts:70-163` byte-identical |
| feeder-kind predicate ×4               | STILL OPEN | `bracket-graph.ts:13,18,31,32` unchanged                        |
| defensive re-check in `flatMap`        | STILL OPEN | `standings.ts:158-161` unchanged                                |
| `refKey` template-literal case         | STILL OPEN | `bracket-graph.ts:5-6` + `use-origin-group-data.ts:37-39`       |
| mutable shared `TeamStat[]` cache      | STILL OPEN | `standings.ts:68` return type still non-readonly                |
| untyped route `meta`                   | STILL OPEN | no `declare module 'vue-router'` augmentation in `src/`         |
| `Number(slotStr) as ThirdPlaceSlot`    | STILL OPEN | `third-place.ts:85` unchanged                                   |
| `context.store as unknown as {…}`      | STILL OPEN | `tournament.ts:70` unchanged                                    |
| `toThirdPlaceKey` non-readonly param   | STILL OPEN | `types/tournament.ts:59` unchanged                              |
| `possibleTeamsFor` returns `Set<Team>` | STILL OPEN | `possible-teams.ts:247` unchanged                               |
| composable imports types from `.vue`   | STILL OPEN | `use-origin-group-data.ts`/`OriginColumn.vue` (see §7)          |
| `syncResults` dead `provider` param    | STILL OPEN | `results-sync/index.ts:77-83`; both call sites pass `undefined` |
| label helpers split across 2 modules   | STILL OPEN | `team-schedule.ts:6-13` + `bracket-labels.ts`                   |
| `isValidResult` boolean walls + casts  | STILL OPEN | `persistence.ts:83-103` unchanged                               |
| `fetch` key shadows global             | STILL OPEN | `use-match-result-form.ts:179`                                  |

---

## 3. HTML markup & accessibility

**Calibration.** This is genuinely strong a11y engineering — native `<dialog>`+`showModal()`
everywhere, a real roving-tabindex tab widget, documented workarounds for the
modal-inert-live-region trap, status always paired with text, reduced-motion honored. Since the
prior review the templates barely moved; the penalty-shootout removal retired one prior
finding, but almost every other item is verifiably STILL OPEN in the exact same lines. The
recurring root cause is a pattern the team clearly knows but applies unevenly: information
encoded only in `aria-hidden` visual cues with a `visually-hidden` sibling that covers _some
but not all_ of it — and the axe gate can't see any of these because they're about meaning, not
structure.

### Genuinely good

- `ConfirmDialog.vue:18-35` — `wasConfirmed` folds Escape, backdrop click and the Cancel button
  into one `@close` path so every dismissal route is treated identically; a rare correct use of
  the native `<dialog>` cancel/close model.
- `TeamDialog.vue:77-118` — a from-scratch `tablist`/`tab`/`tabpanel` with roving `tabindex`,
  Arrow/Home/End handling and correct `aria-controls`/`aria-labelledby` wiring; the one place
  custom ARIA is genuinely warranted, done right.
- `SyncDialog.vue:27-40,64` and `ScoreDialog.vue:78` — a single persistent `role="status"`
  element kept mounted across state transitions, with a comment explaining _why_
  (`v-if`-swapped regions don't announce), plus `fetchMessage` living _inside_ the modal to
  route around `showModal()` inerting the global region.
- `MatchCard.vue:39-55` — `cardSummary()` reconstructs booking info into the score button's
  `aria-label` precisely because the visual card badges are `aria-hidden`; the one spot where
  the aria-hidden-plus-substitute pattern is applied completely.
- `PossibleTeamsDialog.vue:25-26` — `role="list"` re-added with an inline comment noting it
  restores the list role that `list-style:none` strips in Safari/VoiceOver; correct and
  self-documenting.

### Findings

1. **[HIGH] Focusable group-standings scroll region has no accessible name — ×12 on the groups
   page.** `GroupStandingsTable.vue:14` — `<section class="group-standings" tabindex="0">` is
   keyboard-focusable but unlabeled, while the identical wrappers at `ThirdPlaceTable.vue:42`
   (`aria-label="Rangliste"`), `RankingView.vue:39` (`aria-label="FIFA-Weltrangliste"`) and
   `BracketView.vue:100` (`role="region" aria-label`) are all labeled. A keyboard/SR user tabs
   onto twelve silent stops. The `<caption>` at line 16 sits on the inner `<table>`, not the
   section. Add ``:aria-label="`Tabelle Gruppe ${groupId}`"``.

2. **[HIGH] Group letter is `aria-hidden` with no substitute in the one table where it's the
   only context.** `ThirdPlaceRow.vue:59` — `<span … aria-hidden="true">{{ stat.team.group }}</span>`,
   and the `visually-hidden` span at line 61 carries only `statusLabel[status]`, never the
   group. In "Die besten 12 Drittplatzierten" (a cross-group ranking) group membership is
   exactly the datum not implied by the caption. Fold it in:
   `Gruppe {{ stat.team.group }}, {{ statusLabel[status] }}`.

3. **[HIGH] `MatchCardMeta` toggle is a ~20 px tap target in the bracket.**
   `MatchCardMeta.vue:33-44` renders a `<button>` whose style (`:49-60`) has only
   `padding: var(--space-1)` — no `min-height` — around an `--font-size-xs` `<time>`. Every
   other interactive element uses `var(--tap-target)` (44 px). On the knockout page this button
   is the only touch entry point to the highlight feature. Add `min-height: var(--tap-target)`.
   (Cross-referenced in §4.)

4. **[MEDIUM] Numeric rank is `aria-hidden` with no accessible substitute across all three
   standings tables.** `StandingsRow.vue:57` and `ThirdPlaceRow.vue:58` hide the rank; the
   `visually-hidden` sibling (`StandingsRow.vue:59`, `ThirdPlaceRow.vue:61`) carries only the
   status word, never "1.", "2.". A screen-reader user reading a standings table linearly never
   hears the position. Merge rank into the status text (`Platz {{ rank }}, …`).

5. **[MEDIUM] Card steppers label sides "Heim"/"Gast" while goal steppers use team names —
   inconsistent inside one dialog, and the visual grouping has no visible label.**
   `DisciplineInput.vue:20,35` groups are `role="group" aria-label="Heim"/"Gast"` with stepper
   labels "Gelbe Karte Heim …" (`:26,31,41,46`), whereas `ScoreInput.vue:23-24,34-35` feed the
   actual team names into their labels. Sighted non-readers also get no visible "Heim/Gast"
   text — only the aria-label carries it. Thread the team names through `DisciplineInput` and
   render a visible side label.

6. **[LOW] Custom `role="spinbutton"` re-implements a native numeric input, with a redundant
   live region.** `StepperInput.vue:52-64` — a `<span role="spinbutton" tabindex="0">` with
   hand-rolled Arrow/Home handling, no way to type an exact value, and 3 tab stops each (12 per
   score dialog). `aria-live="polite"` + `aria-atomic` (`:59-60`) on the spinbutton itself
   double up with the role's native value announcement. A native
   `<input type="number" inputmode="numeric">` with the ± buttons as enhancement removes both
   problems; at minimum drop the redundant `aria-live`.

7. **[LOW] `aria-hidden="true"` on a focusable native file input.** `SettingsView.vue:119-127`
   — the documented `aria-hidden-focus` anti-pattern; `tabindex="-1"` plus the `visually-hidden`
   clip already remove it from tab order and view. Drop `aria-hidden`.

8. **[LOW] `<article>` vs `<section>` drift for structurally identical labeled cards.**
   `GroupTable.vue:35` uses `<article aria-label>`; `BracketRound.vue:33`,
   `OriginColumn.vue:30`, `ThirdPlaceTable.vue:13` use `<section aria-label>` for the same
   "titled surface-card" role. Pick one.

9. **[LOW] axe gate omits WCAG 2.2, so Target Size is structurally invisible.**
   `e2e/support/a11y.ts:5` — `AXE_TAGS` ends at `wcag21aa` (+ `best-practice`). SC 2.5.8
   Target Size (2.2 AA) — the rule that would mechanically catch the `MatchCardMeta` finding —
   is not in the set. Add `'wcag22aa'`.

**What the axe pass does and doesn't cover:** the suite calls `expectNoA11yViolations` on the
four main views and on several open-dialog states (import confirm, possible-teams, knockout) —
that reliably guards the _mechanical_ layer (contrast, control labels, ARIA validity,
landmarks, `scrollable-region-focusable`). It is structurally blind to every finding above:
none of them are axe violations. The axe gate is necessary but is doing less than its green
checkmark implies.

### Prior-findings status

| Prior finding (§3 + cross-ref)                     | Status      | Evidence                                                                                           |
| -------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| group badge aria-hidden, no substitute             | STILL OPEN  | `ThirdPlaceRow.vue:59`; `:61` span has only status                                                 |
| 12 unlabeled focusable scroll wrappers             | STILL OPEN  | `GroupStandingsTable.vue:14` still no `aria-label`                                                 |
| numeric rank aria-hidden, no substitute            | STILL OPEN  | `StandingsRow.vue:57`, `ThirdPlaceRow.vue:58`                                                      |
| MatchCardMeta ~20 px target                        | STILL OPEN  | `MatchCardMeta.vue:49-60` no `min-height`                                                          |
| custom role=spinbutton                             | STILL OPEN  | `StepperInput.vue:52-64` unchanged                                                                 |
| aria-hidden on focusable file input                | STILL OPEN  | `SettingsView.vue:124`                                                                             |
| axe missing wcag22aa                               | STILL OPEN  | `e2e/support/a11y.ts:5`                                                                            |
| article vs section drift                           | STILL OPEN  | `GroupTable.vue:35` vs `BracketRound.vue:33` etc.                                                  |
| score dialog / DisciplineInput label inconsistency | STILL OPEN  | `DisciplineInput.vue:20,26` "Heim" vs `ScoreInput.vue:23` team name                                |
| standings abbreviation walls                       | MOSTLY OPEN | `TeamStats.vue:40-45` now icon+hidden-text for cards; `GroupStandingsTable.vue:24-56` still `abbr` |

---

## 4. Styling & UI/UX

**Calibration.** The design-token layer is genuinely strong — a real single source of truth for
spacing, radii, type scale, motion, state-layer opacities and a properly-ordered dark palette —
and shared recipes (`surface-card`, `btn`, `standings-cell__*`, `card-header`) deduplicate
rather than copy-paste. That makes the gaps stand out: they are almost entirely at the
_platform edge_ (safe-area, dvh, theme-color, color-scheme) and at the _pre-reader audience_
(abbreviation walls, flag-less score dialog, tiny score numerals, hamburger nav). Since
`56037b5` the CSS files are essentially untouched, so nearly every prior styling finding
stands. The worst offenders were confirmed visually at 390×844.

### Genuinely good

- **Dark mode is done at the palette layer, correctly.** `tokens.css:88-162` separates a
  `prefers-color-scheme` block from explicit `[data-theme]` overrides, ordered by source order
  with a documented specificity rationale, and compensates for weak dark-surface shadows with a
  border-tint ring (`tokens.css:106-112`).
- **`--tap-target: 44px` is honored almost everywhere** — `.btn`, `.stepper__step`,
  `.app-nav__link`, `.app-header__burger`, `.theme-picker__option` all set it. The discipline
  is real; MatchCardMeta is the one exception.
- **State layers follow the Material opacity spec via tokens** (`--state-hover/focus/pressed`
  8/12/12, `tokens.css:40-43`) instead of magic numbers, and reduced-motion is honored both
  globally (`reset.css:92-101`) and per-animation (the spinning ball, `AppHeader.vue:82-86`).
- **Shared recipe extraction is principled**, with comments explaining _what stays local and
  why_ (`standings-row.css:8-13`; the sticky-vs-non-sticky `card-header` note,
  `base.css:113-123`).
- **Bundle-conscious flag subset** (`flags.scss`) with a spec test guarding the country list
  against drift from the data modules — a rare instance of tying CSS to a correctness gate.

### Findings

1. **[HIGH] No `env(safe-area-inset-*)` anywhere.** `AppHeader.vue:51-57`, `base.css:23-34` —
   zero grep hits across `src/` and `index.html`. The sticky header and skip link sit under the
   notch/Dynamic Island, and scrollable views have no bottom inset for the home indicator, on
   an app whose whole premise is a home-screen PWA. Add
   `padding-top: env(safe-area-inset-top)` to `.app-header__bar`,
   `padding-bottom: max(var(--space-4), env(safe-area-inset-bottom))` to `.app-main`, and
   `viewport-fit=cover` to the viewport meta (also absent). Same family: `min-height: 100vh`
   not `100dvh` (`reset.css:36`; `90vh` dialog caps at `TeamDialog.vue:62`,
   `PossibleTeamsDialog.vue:18`) — the classic mobile URL-bar jump; swap to `dvh` with a `vh`
   fallback line.

2. **[HIGH] Mobile navigation is still a hamburger, not persistent tabs.** `AppNav.vue:26-37`
   (`display:none` until `--open`), `AppHeader.vue:30-44`. All four views hide behind an
   abstract three-line glyph until `min-width:640px`. A pre-reader can tap persistent icon tabs
   but will never discover a burger menu; the requirements specify a bottom tab bar
   (`requirements.md:218`). The icon+label markup already exists (`AppNav.vue:16-19`) — render
   it as a fixed bottom bar below 640px (`position:fixed; inset-inline:0; bottom:0` +
   `env(safe-area-inset-bottom)`) instead of collapsing it.

3. **[HIGH] The score dialog — the one screen where a child acts — identifies teams by muted
   gray text and no flags.** `ScoreDialog.vue:49-52` (`.score-dialog__team-name` is
   `color: var(--color-text-muted)`, `aria-hidden`), `ScoreInput.vue:20-36` uses team names
   only in aria-labels. Verified visually: two low-contrast words over identical steppers.
   Worse, `DisciplineInput.vue:19-49` wraps `flex-wrap` groups at `min-width:9rem` (line 88),
   so on a 390px phone the Heim/Gast columns stack into one and the only home/away cue is an
   `aria-label` — a sighted user sees four identical card steppers. Put a large `TeamFlag`
   above each goal stepper and label the two card groups with the flag/name.

4. **[HIGH] Standings tables are abbreviation walls with hover-only expansion.**
   `GroupStandingsTable.vue:24-56`, `ThirdPlaceTable.vue`, `TeamStats.vue` — headers
   `Sp S U N T+ T- TD Pkt` whose full words live only in `<abbr title>` (no hover on touch) and
   `visually-hidden` spans (invisible to a sighted non-reader). The app already speaks icon
   (⚽🟨🟥); use an icon/emoji header row or a persistent inline legend, not a hover affordance
   that structurally cannot fire on the target device.

5. **[MEDIUM] The entered score — the number the family stares at all tournament — renders at
   15px.** `MatchScoreButton.vue:44` (`font-size: var(--font-size-sm)`);
   `.match-score-btn__value` (line 81) never overrides it. Requirements ask for ≥32px numerals;
   `--font-size-score` exists (`tokens.css:24`) but is used only inside the dialog steppers.
   Digits are the one thing early readers _can_ read — set
   `.match-score-btn__value { font-size: var(--font-size-lg) }` at minimum.

6. **[MEDIUM] `:focus-visible` overwrites every element's own `border-radius`.**
   `base.css:16-20` sets `border-radius: var(--radius-sm)` on the universal focus rule. Modern
   browsers already make the outline follow the element's radius — and this line actively
   mutates shape: a keyboard-focused `.btn` (radius-md) snaps to 4px corners while the
   sharp-cornered `.theme-picker__option` gains rounding. Drop the declaration.

7. **[MEDIUM] `color-scheme` is never declared.** No `color-scheme` property anywhere (grep
   confirms only comments). In dark mode the page scrollbars, the standings/bracket overflow
   scrollbars, form-control chrome and carets stay light-themed because the UA is never told
   the document is dark. Add `color-scheme: light dark` to `:root` and set it explicitly on the
   `[data-theme]` blocks.

8. **[MEDIUM] `theme-color` is hardcoded dark and there is no anti-FOUC bootstrap.**
   `index.html:6` pins `#0f172a`, so in light mode the OS chrome is dark navy over an off-white
   app; and `App.vue:22-32` applies the theme in a post-hydration `watchEffect`, so a
   light-mode user on a dark-OS device gets a dark flash every cold start. Fix both with a tiny
   synchronous inline script in `index.html` that reads the persisted theme, sets `data-theme`
   before first paint, and updates the `theme-color` meta.

9. **[MEDIUM] Destructive "Zurücksetzen" sits inline with three harmless data actions.**
   `SettingsView.vue:108-113` — Exportieren / Importieren / Ergebnisse abrufen / Zurücksetzen
   share one flex row, equal weight, differing only by outline color. The tournament-nuking
   action deserves its own separated block, not a recolor a child won't parse.

10. **[MEDIUM] The stat-table header recipe is redeclared in four scoped blocks.**
    `GroupStandingsTable.vue:83-98`, `TeamStats.vue`, `ThirdPlaceTable.vue`, `SquadList.vue`
    each hand-write the same `th` padding/align/muted/nowrap rule. The project already knows
    the fix (`standings-row.css`); promote a `.stat-table` utility there.

11. **[LOW] The whole card body is clickable but only the pill shows feedback.**
    `MatchCard.vue:149-151` added `cursor:pointer` on the body (an improvement over the prior
    review), but the sole _visual_ state still lives on `.match-score-btn__pill:hover`
    (`MatchScoreButton.vue:76-79`). Add a hover/`:active` background on `.match-card__body`, or
    scope the click to the pill.

12. **[LOW] Horizontal-scroll bracket has no scroll affordance.** `BracketView.vue:137-139` is
    `overflow-x:auto` with no edge fade, mask, or `scroll-snap`. A child has no cue the K.-o.
    round scrolls sideways. Add an inline-edge `mask-image` gradient fade and
    `scroll-snap-type: x proximity`.

13. **[LOW] Token-scale strays.** `base.css:142` literal `font-weight: 700` inside the shared
    heading recipe (a `--font-weight-bold` token exists); `SquadList.vue:87` `font-weight: 500`
    (maps to no token); `AppHeader.vue:118` `border-radius: 2px`; `standings-row.css:43` bare
    `2px` padding beside a token in the same declaration. Everything else is disciplined —
    normalize these.

14. **[LOW] Modernity gaps the ES2025 target could close.** The `640px` breakpoint is repeated
    raw in `AppNav.vue:66`, `AppHeader.vue:121`, `App.vue:94` with no token; there is zero
    native CSS nesting in any scoped block; ~15 inline `color-mix()` state layers recompute the
    same expression across base.css/AppHeader/StepperInput/ThemePicker/AppNav. Tokenize the
    breakpoint and consider a state-layer utility. Container queries would suit
    `MatchCard`/`GroupTable` (whose width varies inside the `auto-fit` grid independently of
    the viewport) better than the viewport `49rem` query.

15. **[LOW] Elevation/motion tokens exist but drive no feedback.** `--elevation-*` never
    responds to press/hover, and dialogs/menu appear with no transition despite `--motion-*`
    tokens — `BaseDialog.vue` has no `@starting-style`/transition, `AppNav__list--open` toggles
    `display` with no ease. Cheap wins: a fade/scale on dialog open (`@starting-style` +
    `transition`), a lift on `MatchScoreButton:active`.

### Prior-findings status

| Prior finding (§4 + cross-ref)        | Status          | Evidence                                                                    |
| ------------------------------------- | --------------- | --------------------------------------------------------------------------- |
| No safe-area-inset (top #7)           | STILL OPEN      | zero grep hits in `src/` + `index.html`                                     |
| `100vh` not `dvh` (top #7)            | STILL OPEN      | `reset.css:36`; `90vh` at `TeamDialog.vue:62`, `PossibleTeamsDialog.vue:18` |
| Static `theme-color`                  | STILL OPEN      | `index.html:6` `#0f172a`, no runtime update                                 |
| No anti-FOUC bootstrap                | STILL OPEN      | `App.vue:22-32` post-hydration `watchEffect`                                |
| Standings abbreviation walls (top #9) | STILL OPEN      | `GroupStandingsTable.vue:24-56`, verified visually                          |
| Destructive action inline             | STILL OPEN      | `SettingsView.vue:108-113`                                                  |
| Mobile hamburger nav (top #2)         | STILL OPEN      | `AppNav.vue:26-37`, `AppHeader.vue:30-44`                                   |
| Bracket scroll no affordance          | STILL OPEN      | `BracketView.vue:137-139`                                                   |
| Card-body click affordance invisible  | PARTIALLY FIXED | `cursor:pointer` added (`MatchCard.vue:149-151`); still no hover visual     |
| Stat-table header recipe ×4           | STILL OPEN      | th block in 4 `.vue` files                                                  |
| Inline `color-mix` state layers       | STILL OPEN      | base.css/AppHeader/StepperInput/ThemePicker/AppNav                          |
| No native CSS nesting                 | STILL OPEN      | grep: no `&` selectors in any scoped block                                  |
| `640px` untokenized ×3 vs `49rem`     | STILL OPEN      | `AppNav.vue:66`, `AppHeader.vue:121`, `App.vue:94`                          |
| Token-scale strays                    | STILL OPEN      | `base.css:142`, `SquadList.vue:87`, `AppHeader.vue:118`                     |
| Elevation/motion under-used           | STILL OPEN      | BaseDialog no transition; menu toggles `display`                            |
| MatchCardMeta ~20px target (top #8)   | STILL OPEN      | `MatchCardMeta.vue:49-60`, no `min-height`                                  |
| Score dialog flag-less (top #3)       | STILL OPEN      | `ScoreDialog.vue:49-52`, `DisciplineInput.vue:20-48`, verified visually     |
| Score renders at 15px                 | STILL OPEN      | `MatchScoreButton.vue:44`                                                   |

---

## 5. Tests

**Calibration.** `npm run test:unit:coverage` is green: 66 files, 650 tests, ~14 s, coverage
**97.6% stmt / 93.0% branch / 98.8% func / 98.7% line** (v8). This is a genuinely strong suite
— the co-located mirror is complete, the domain-heavy specs document the standings math they
depend on, and the e2e page-object layer is disciplined. The changes since `56037b5` (shootout
removal, `invalidation.spec.ts`, `flags.spec.ts`, `persistence-contract.spec.ts`) are net
improvements. Remaining issues are duplication and level-placement, not holes; branch coverage
is the only number with real slack and most of it is genuinely-hard-to-hit eviction/error
paths.

### Genuinely good

- `src/lib/persistence.spec.ts:69-77` — the `it.each` fuzz table inlines each corrupt field as
  **raw JSON text** specifically so it can express `1e400`→`Infinity`, which `JSON.stringify`
  would flatten to `null`; the comment (63-68) explains exactly why.
- `e2e/persistence-contract.spec.ts:19-49` — a canary that drives a real UI action and asserts
  the plugin's on-disk shape equals `storedState(...)` byte-for-byte, keeping the fast
  localStorage-seeding shortcut honest. The paired comment in `e2e/support/results.ts:12-21`
  closes the loop.
- `src/lib/invalidation.spec.ts` — every scenario states the standings math it relies on and
  claims it was verified against `computeGroupStandings`; the cards-only fair-play flip
  (`:91-107`) is a genuinely subtle case most suites would miss.
- `src/styles/flags.spec.ts:25-37` — bidirectional subset guard (missing codes AND dead codes
  AND duplicates) over the SCSS list; exactly the regression class that ships silently as blank
  flags.
- `src/lib/results-sync/providers/espn.spec.ts` — the `ev()` builder + `recordingFetch` keep
  20+ skip/clamp/shootout-fold/abort/error cases readable without literal soup; a model for the
  rest of the suite.

### Findings

1. **[MEDIUM] Four copy-paste discipline tests one file away from the fix.**
   `src/components/ScoreDialog.spec.ts:153-189` — four near-identical `home/away ×
yellow/red` tests that each mount, click one aria-labelled button, save, and assert one
   field. Its sibling `DisciplineInput.spec.ts:35-47` already parametrizes this exact four-way
   symmetry with `it.each`. Worse, these four re-prove DisciplineInput's emit symmetry through
   a full ScoreDialog mount — one integration test ("a discipline field reaches the store on
   save") plus DisciplineInput's parametrized emits would cover it. Collapse to a single
   `it.each` over `[label, field]`.

2. **[MEDIUM] The M53→M79/M92 invalidation scenario is hand-encoded in three spec files.**
   `src/lib/invalidation.spec.ts:34` proves the pure fact; `src/stores/tournament.spec.ts:124-137`
   re-seeds the identical scenario and re-asserts the identical fact through `enterResult`;
   `src/components/ScoreDialog.spec.ts:338-434` seeds it a third time. The component tests earn
   their keep (they test the ConfirmDialog UI), but the store test only needs to prove _wiring_
   (`enterResult` delegates to `invalidatedDownstream`) — it currently re-encodes the domain
   fact, so a fixture-standings change breaks two files with the same debugging. Use a trivial
   synthetic invalidation in the store test, or assert delegation via a spy.

3. **[MEDIUM] e2e re-derives static structure the component test already proves.**
   `e2e/knockout.spec.ts:25-43` asserts the 5 round headings, the 32-card total, and the
   "Spiel um Platz 3"/"Finale" section labels — all zero-interaction static render.
   `BracketView.spec.ts:41,55-79,121` already proves them at unit speed. Keep one e2e
   wiring/mount check; drop the three static-render browser tests. (The interactive knockout
   e2e tests are correctly placed.)

4. **[LOW] The `findAll('button').find((b) => …)` idiom is now 36× across 7 spec files with no
   helper.** Heaviest in `ScoreDialog.spec.ts`; also `ScoreInput`, `DisciplineInput`,
   `SyncDialog`, `ConfirmDialog`, `UpdateDialog`, `SettingsView` specs. Every call ends in a
   bare `!` that yields a useless "undefined is not an object" on failure. A one-line
   `findButtonByText(wrapper, text)` in `src/test-support` centralizes it and gives a real
   failure message. Grew since the prior review flagged ~18.

5. **[LOW] `Result` factory still bypassed in four places, one shadowing the shared import.**
   `src/stores/tournament.spec.ts:27-29` defines a local `makeResult` (same-named shadow of
   `src/test-support/results.ts`), `use-results-sync.spec.ts:9-17` defines a local `result()`,
   `SettingsView.spec.ts:161,244` hand-write full 6-field literals, and
   `e2e/support/results.ts:8-10,34-38` reimplements the `src` factory although it already
   imports `src/` modules. One `Result` shape change still fans out to ~4 files.
   (`ScoreDialog.spec.ts:10` now _does_ import it — partial progress.)

6. **[LOW] TeamDialog's Home/End tab keyboard nav is implemented but untested.**
   `TeamDialog.vue:48-53` handles `Home`/`End` for the ARIA tablist;
   `TeamDialog.spec.ts:107-141` covers only `ArrowRight`/`ArrowLeft`. This is the concrete
   branch behind the file's 64% branch coverage, and Home/End are part of the tablist keyboard
   contract. Add two rows to a parametrized keyboard test.

7. **[LOW] `src/lib/assert-never.spec.ts` remains coverage-filler.** Two tests for a one-line
   throw whose only regression is already caught by `tsc` exhaustiveness at every call site.
   Reads as existing for the 96% gate.

### Prior-findings status

| Prior finding (§5)                                | Status               | Evidence                                                          |
| ------------------------------------------------- | -------------------- | ----------------------------------------------------------------- |
| `assert-never.spec.ts` coverage-filler            | STILL OPEN           | unchanged, 14 lines, two trivial cases                            |
| e2e re-derives BracketView structural facts       | STILL OPEN           | `e2e/knockout.spec.ts:25-43` ⟷ `BracketView.spec.ts:41,55-79,121` |
| Factory opt-outs / shadowing `makeResult`         | STILL OPEN (partial) | shadow at `tournament.spec.ts:27`; ScoreDialog now imports it     |
| Four copy-paste card-increment tests              | STILL OPEN           | `ScoreDialog.spec.ts:153-189` vs `DisciplineInput.spec.ts:35-47`  |
| `e2e/support/results.ts` duplicates `src` factory | STILL OPEN           | `e2e/support/results.ts:8-10,34-38`                               |
| Missing `findButtonByText` helper                 | STILL OPEN (worse)   | idiom now 36× across 7 files (was ~18)                            |

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

| Prior finding (§6)                        | Status     | Evidence                                                         |
| ----------------------------------------- | ---------- | ---------------------------------------------------------------- |
| No type-aware linting                     | STILL OPEN | `eslint.config.js:15` still non-typed `recommended`              |
| oxlint `perf`/`pedantic` off, uncommented | STILL OPEN | `.oxlintrc.json:4-7`                                             |
| Manifest minimal                          | STILL OPEN | no screenshots/categories/shortcuts; apple-touch reuses icon-192 |
| No CSP meta                               | STILL OPEN | `index.html` has no CSP `<meta>`                                 |
| Versioning invisible                      | STILL OPEN | `package.json:3` still `0.1.0`, no CHANGELOG                     |
| ESPN dependency risk undocumented         | STILL OPEN | no shape guard/monitoring beyond provider parsing                |

---

## 7. General engineering

**Calibration.** The week's two headline changes are both net-positive: the invalidation guard
(`6b8165f`) is close to a model implementation of a cross-layer invariant, and the shootout
removal (`d46bd91`) deleted 328 lines and updated both docs in the same commit. The engineering
core remains unusually clean — `src/lib` still has zero Vue/Pinia imports (grep-verified) and
comments are overwhelmingly high-value why-comments. But the shootout removal shipped a silent
data-semantics change to already-persisted user data with `SCHEMA_VERSION` untouched, and
almost every §7 finding from the prior review that wasn't fixed _by deletion_ is still open.

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

1. **[HIGH] Shootout removal changed the meaning of persisted data with no migration —
   existing users' brackets silently regress.** `src/lib/persistence.ts:4,11` —
   `SCHEMA_VERSION` is still `1` and the storage key still `wc2026:results:v1` after
   `d46bd91`, but the semantics of a level knockout score flipped from "decided by shootout
   (see `shootoutWinner`)" to "not decided yet". Legacy entries like
   `{homeGoals: 1, awayGoals: 1, shootoutWinner: 'home'}` pass validation unchanged
   (`isValidResult`, `persistence.ts:80-105`, doesn't reject unknown keys), so on next load
   the match becomes undecided while its _downstream_ results (a QF entered after that
   shootout R16) stay stored — precisely the silent re-attribution class `6b8165f` was built
   to prevent, now reachable via the hydration path the `enterResult` invariant doesn't cover.
   Old export files re-import the same way since `parseImport` still accepts `version: 1`.
   This is live: the app deploys on push to main and the knockout stage began 28 June —
   shootouts have almost certainly been entered. Fix: bump `SCHEMA_VERSION` to 2 with a v1→v2
   migration that folds `shootoutWinner` into a +1 goal for the winner (mirroring what
   `espn.ts:115-117` already does for fetched data), and read/migrate the old key once.

2. **[MEDIUM] The store's invariant comment overclaims: two of four write paths don't enforce
   it.** `src/stores/tournament.ts:22-26` says "the store never keeps a knockout result whose
   participants no longer match what it was entered for … no caller can forget" — true for
   `enterResult`/`clearResult`, false for `importResults` (`tournament.ts:48-52`) and
   `afterHydrate` (`tournament.ts:69-74`), which install unvalidated-for-consistency maps;
   `docs/requirements.md:383-387` (§9.8) documents this as a known loophole while the store
   comment claims the opposite. Either scope the comment honestly ("for interactive edits") or
   run a consistency sweep (drop knockout results whose refs don't resolve) in
   `importResults`/`afterHydrate` — which would also blunt finding 1. (See also §9.5.)

3. **[MEDIUM] `results-sync` YAGNI surface survived the refactor and now produces
   `undefined`-warts at every call site.** `src/lib/results-sync/provider.ts:33-35` —
   `ResultsProvider.id`/`label` are still read nowhere, and both real callers of
   `syncResults(provider = defaultProvider, opts?)` now pass a literal `undefined` first
   argument (`use-results-sync.ts:37`, `use-match-result-form.ts:144`). `d46bd91` touched all
   four files and was the natural moment. Make it `syncResults(opts?)`, delete `id`/`label`;
   `FetchResultsOptions.fetchImpl` already covers test injection. (Details in §2.9.)

4. **[LOW] `useMatchResultForm` got a fifth concern instead of a split.**
   `src/composables/use-match-result-form.ts` (181 lines) now mixes form state, store writes,
   the pending-confirm state machine (lines 54-114), a11y announcements, and the live-fetch
   machine (lines 116-165) — the prior review's duplicate abort/status machinery vs
   `use-results-sync.ts` still stands. Extracting just the fetch block into a
   `useLiveResultFetch` would cut the file by a third and kill the duplication.

5. **[LOW] Small persisting coupling/comment debts, all one-line fixes.**
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
   errors untouched — and one new drift added since.** Full list in §9.3; new since the review
   that flagged it: "`/` redirects to `/groups`" (`requirements.md:228`) vs the now-conditional
   redirect (`src/router.ts:10-15`). Agents reading this doc as spec inherit six wrong facts.
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
| requirements.md drift, 5+ places (top #6)         | PARTIALLY FIXED        | shootout + live-fetch sections reconciled in `d46bd91`; 5 errors remain + new `/`-redirect drift                         |
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
and invalidation (`6b8165f`) closed the old #1 HIGH cleanly. But the shootout simplification
shipped with its user-facing half missing — the folding rule exists only in docs, and the app
is _right now_ entering the phase (SF/final week) where shootouts happen. Meanwhile nearly
every audience-facing language/icon finding from the prior review is still open, and
`docs/requirements.md` was updated for the shootout change while leaving five known-wrong
claims in place.

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
  child-register German — short words, direct question. The right voice; it's just missing one
  sentence (finding 1).

### Findings

1. **[HIGH] A shootout match can neither be entered nor read faithfully — the folding
   convention is invisible in the product.** `src/components/ScoreDialog.vue:56-58` blocks a
   level knockout save with "Wer hat gewonnen?" but never says _what to enter_: the rule "add
   the penalty goals to the score" lives only in `docs/requirements.md:84-86,255-256`. A family
   that just watched 1:1, 4:2 i.E. is stuck — and if they guess, every surface then shows a
   score that never happened ("5:3") with no marker: `grep -rn "Elfmeter\|i\. E\|n\.V"` over
   `src/` (non-spec) returns nothing. The ESPN fetch writes these synthetic scores
   automatically (`espn.ts:115-117`), so after "Ergebnis holen" the card contradicts the TV and
   every news site. This matters _today_: SF is Jul 14/15, and deep-knockout games are the most
   shootout-prone. Minimum fix, no model change: extend the draw error ("Nach
   Elfmeterschießen: Elfmetertore mitzählen — aus 1:1 und 4:2 wird 5:3") and render a small
   "n. E." badge on knockout results where a shootout is plausible — though plausibility is
   undetectable, which is itself the argument for one optional display-only boolean
   (`decidedByPenalties`) that touches no resolution logic.

2. **[MEDIUM] Shootout kicks now pollute team goal stats, and shootout wins count as wins.**
   `src/lib/team-schedule.ts:73-88` — `computeTeamStats` sums `result.homeGoals/awayGoals` over
   _all_ matches, so with folded scores a team winning two shootouts 1:1/4:2 gets +8 Tore in
   `TeamDialog`; FIFA statistical convention counts shootout matches as draws, this counts them
   as W/L. A concrete regression introduced by `d46bd91` (previously goals were real and
   `shootoutWinner` was separate). Group standings are unaffected (`standings.ts` is
   group-only). Fix: at minimum a "Known simplifications" entry in `requirements.md`; better,
   the display-only flag above lets stats subtract the padding.

3. **[MEDIUM] `docs/requirements.md` was touched for the shootout change but the five
   known-wrong claims survived (prior HIGH, selectively addressed).** Still claims
   `registerType: 'autoUpdate'` (`requirements.md:47,341` vs `vite.config.ts:25` `'prompt'`),
   `navigateFallback` to index.html (`:345` vs `vite.config.ts:46` `null`), theme
   `'light'|'dark'` default `'light'` (`:211,303` vs `settings.ts:4-9` `'system'`), "Bottom
   navigation" (`:218`) vs the actual hamburger (`AppNav.vue:27`, `AppHeader.vue:31-43`), §7.6
   (`:302-305`) still omits the shipped bulk "Ergebnisse abrufen" sync — plus the new `/`
   redirect drift (§8.3). `d46bd91` proves the team _can_ keep this doc current; do one
   reconciliation pass and add a "last reconciled at commit" header.

4. **[MEDIUM] Bulk sync is still wholesale-destructive, and its success message overstates.**
   `src/views/SettingsView.vue:21,111` replaces the entire store via `importResults`; matches
   the feed misses or that fail ref-resolution are silently dropped
   (`results-sync/index.ts:53` `continue`), destroying manual entries. New since `56037b5`:
   consent is now explicit ("Abrufen & ersetzen", `SyncDialog.vue:59,76`) — good — but "N
   Spiele wurden aktualisiert" (`SyncDialog.vue:37`) reports `Object.keys(results).length`
   (`use-results-sync.ts:40`), the fetched-map size, not what changed or what was lost. Merge
   by matchId and report a real delta.

5. **[LOW] `importResults` silently bypasses the invalidation invariant the store claims is
   unforgettable.** `src/stores/tournament.ts:22-26` says "the store never keeps a knockout
   result whose participants no longer match what it was entered for … no caller can forget",
   but `importResults` (`:48-52`) installs any validator-passing map wholesale — a hand-edited
   import (level M73 + stored M90, which `persistence.ts:80-105` accepts; it has no
   knockout-draw check) persists exactly such orphaned attributions. Either run one forward
   resolve-and-drop pass on import or scope the comment to `enterResult`/`clearResult`.
   (Same root cause as §7.2.)

6. **[LOW] `tournament-rules.md` still describes the deleted model.**
   `docs/tournament-rules.md:171-173`: "a knockout result is simply whoever the user records as
   the winner" — there is no recorded winner anymore; the sibling doc has the correct
   folded-score wording (`requirements.md:33-36`). One-sentence sync.

7. **[LOW] Level knockout result still yields an empty possible-teams set — and the new model
   makes the fix unambiguous.** `src/lib/possible-teams.ts:216-221`: an imported level knockout
   result short-circuits to exact resolution → `null` → "no team can fill this slot". Under
   `d46bd91` semantics a level score officially means "not decided yet"
   (`types/tournament.ts:115-116`), so falling through to the home∪away union at `:222-230` is
   now clearly correct, not a judgment call.

8. **[LOW] The invalidation confirm dialog cites match numbers the UI never shows.**
   `invalidatedMatchLabel` produces "Achtelfinale (Spiel 89): …" (`invalidation.ts:83`) and
   `bracket-labels.ts:22-25` says "Sieger Sp. 73", but no card anywhere renders its match
   number — the reader can't locate "Spiel 89". Team names save the confirm dialog, but
   printing `match.id` on bracket cards would fix both at once.

### Prior-findings status

| Prior finding (§9 + cross-ref)                     | Status                              | Evidence                                                                                   |
| -------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| group edit silently re-attributes knockout results | **FIXED**                           | `invalidation.ts` + atomic cascade in `tournament.ts:27-40` + confirm flow                 |
| destructive whole-tournament sync                  | STILL OPEN (consent added)          | `SettingsView.vue:21` wholesale replace; "Abrufen & ersetzen" is new, but no merge         |
| double-layer standings caching                     | STILL OPEN                          | `standings.ts:55,74` module cache + store computed `tournament.ts:18-20`                   |
| 1M-combo synchronous budget                        | STILL OPEN                          | `possible-teams.ts:55` `MAX_ENUMERATION_COMBOS = 1_000_000`                                |
| empty set for level knockout result                | STILL OPEN                          | `possible-teams.ts:216-221` (now cheaper to justify fixing)                                |
| dead `TeamStat.form`                               | STILL OPEN                          | `standings.ts:27,104,133-148`, never rendered                                              |
| hamburger nav vs pre-readers + spec (top #2)       | STILL OPEN                          | `AppNav.vue:27`; `requirements.md:218` still promises bottom nav                           |
| score dialog teams text-only (top #3)              | STILL OPEN (shootout half obsolete) | `ScoreDialog.vue:49-52` muted `aria-hidden` names                                          |
| standings abbreviation walls (top #9)              | STILL OPEN                          | `GroupStandingsTable.vue:24-38` `<abbr title>` headers                                     |
| 15 px score on match cards                         | STILL OPEN                          | `MatchScoreButton.vue:44` `--font-size-sm`                                                 |
| "K.-o.-Runde" / "Sieger Sp. 73" / "Bosnien H."     | STILL OPEN                          | `router.ts:27`, `bracket-labels.ts:22-25`, `teams.ts:26`                                   |
| no "Heute" entry point, no champion payoff         | STILL OPEN                          | `grep -rn "Heute\|Weltmeister" src/` (views/components) returns nothing                    |
| requirements.md drift, 5 places (top #6)           | PARTIALLY FIXED                     | shootout sections rewritten; autoUpdate/navigateFallback/theme/bottom-nav/§7.6 still wrong |
