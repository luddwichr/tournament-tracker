# REVIEW.md — WM 2026 Tracker, full-app roast

Reviewed 2026-07-06 at commit `56037b5`. Eight focused review passes (Vue, TypeScript,
HTML/a11y, styling/UX, tests, setup/tooling, engineering + AI-friendliness, functional/domain),
each reading the relevant sources in full. Findings are grouped by topic and ranked by
relevance within each section. Cross-cutting findings live in their most natural section and
are cross-referenced elsewhere.

**Calibration up front:** this codebase is in the top few percent of hobby-project quality —
the domain core is *correct* (the Article-13 tiebreaker chain, the 495-entry Annex-C
third-place allocation table, and the R32 slot mapping were all verified against
`docs/tournament-rules.md`, the allocation table programmatically). The roast below is real,
but most of it is drift, polish, and a handful of genuine traps — not rot.

## Top findings (the ones to fix first)

| # | Severity | Finding | Section |
|---|----------|---------|---------|
| 1 | HIGH | Editing a group result silently re-attributes already-entered knockout results to different teams | §9.1 |
| 2 | HIGH | Flag-icons CSS ships as a 421 KB chunk of inlined data-URI SVGs (+3.8 MB of partly duplicated SVG assets) on the critical path of nearly every screen | §6.10 |
| 3 | HIGH | `.githooks/pre-push` has no `set -e` — a failing `check:code` does not block the push | §6.11 |
| 4 | HIGH | `shootoutWinner` is never validated on import/rehydration; garbage values silently decide knockout matches | §2.1 |
| 5 | HIGH | Mobile navigation hides all four views behind a hamburger — unusable for the pre-reader audience, and the requirements specify a bottom tab bar | §9.5 |
| 6 | HIGH | The score-entry dialog identifies teams by muted text only — no flags, on the one screen where a child acts | §9.6 |
| 7 | HIGH | ES2025 build target with no fallback, no `<noscript>`, no error handler, no telemetry — incompatible devices get a silent white screen nobody hears about | §6.12 |
| 8 | HIGH | CLAUDE.md is 10 lines and answers none of the questions an agent has on turn one | §8.1 |
| 9 | HIGH | `docs/requirements.md` has drifted from the code in at least five places while presenting itself as authoritative-adjacent | §8.2 |
| 10 | HIGH | No `safe-area-inset-*` anywhere and `100vh` instead of `dvh` — visible defects in the installed PWA on modern iPhones | §4.1/§4.2 |
| 11 | HIGH | The `MatchCardMeta` toggle is a ~20 px tap target in an app where everything else honors 44 px | §3.5 |
| 12 | HIGH | Standings tables communicate through bare two-letter abbreviations (`Sp`, `U`, `TD`, `Pkt`) — the one major screen that defeats a non-reading child | §9.7 |

---

## 1. Vue components

### Simplicity & conciseness

1. **[MEDIUM] Triplicated table-header markup (~90 lines of copy-paste).**
   `src/components/GroupStandingsTable.vue:24-57`, `src/components/TeamStats.vue:14-47`,
   `src/components/ThirdPlaceTable.vue:48-70`. The
   `<th scope="col"><abbr title="…">Sp</abbr><span class="visually-hidden">Spiele</span></th>`
   block is hand-written 20 times across three components. Better: a `v-for` over a
   `{ abbr, label }` column-definition array per table — no new component needed, and
   GroupStandingsTable shrinks from 99 lines to ~50.

2. **[MEDIUM] Knockout click path resolves teams twice through a 3-hop emit chain.**
   `src/views/KnockoutView.vue:11-17`, `src/components/BracketView.vue:16,116`,
   `src/components/BracketRound.vue:60`. A click travels MatchCard `openScore` → BracketRound
   `matchClick` → BracketView `matchClick` → KnockoutView `selectMatch`, where `resolveTeamRef`
   runs again although BracketView already resolved both teams in `toRow()`. Meanwhile
   `GroupTable.vue:27-31` calls the injected `useScoreDialog()` directly with zero hops.
   Better: BracketView opens the dialog itself from the rows it already built; KnockoutView
   becomes a pure layout shell.

3. **[MEDIUM] Continuation-passing `save(close)` / `clear(close)` is needless indirection.**
   `src/composables/use-match-result-form.ts:53,69`, `src/components/ScoreDialog.vue:106,113`.
   The composable takes a `close` callback purely to invoke it at the end. Better: `save()`
   returns `boolean` and the component does `if (save()) close()` — the component owns its
   dialog lifecycle, the composable owns the data.

4. **[MEDIUM] Side-effect ternary in a template.**
   `src/components/ScoreDialog.vue:113` —
   `@click="knockoutDraw ? (attemptedDrawSave = true) : save(close)"`. An assignment buried in
   a template expression. Better: a `handleSave()` method; the branch becomes greppable and
   testable.

5. **[LOW] Redundant `<Teleport to="body">` around a native `<dialog>`.**
   `src/components/BracketView.vue:126-133`. `showModal()` renders in the top layer regardless
   of DOM position; no other BaseDialog consumer teleports. Drop it.

6. **[LOW] Duplicated shootout buttons.** `src/components/ScoreDialog.vue:48-70` — the two
   buttons are byte-identical except `'home'`/`'away'`. A `v-for="side in (['home','away'] as const)"`
   halves the fieldset; not worth a child component.

7. **[LOW] Composable extracted to satisfy a lint limit, by its own admission** — see §7.7
   (the confessional comment is the engineering finding; the extraction itself is fine).

### Modern Vue 3.5 practices

1. **[MEDIUM] Zero use of reactive props destructure despite pinning Vue 3.5.39.**
   `src/components/BaseDialog.vue:5-17`, `src/components/MatchCardMeta.vue:15-22`,
   `src/components/StepperInput.vue:4-11`. Every component with defaults still uses pre-3.5
   `withDefaults(defineProps<…>(), {…})`, and script access goes through `props.x`. Better:
   `const { showCloseButton = true, maxWidth } = defineProps<{…}>()`. Worst offender:
   MatchCardMeta's `withDefaults(…, { static: false })` — defaulting an optional boolean to
   `false` is a no-op; the wrapper exists for nothing.

2. **[MEDIUM] `computed` with no reactive dependencies.**
   `src/views/RankingView.vue:15-20` — `rows` derives from immutable module data and can never
   recompute. A plain `const rows = fifaRanking.map(…)` says what it is.

3. **[MEDIUM] Common-prefix string inference for the spinbutton label is a fragile hack.**
   `src/components/StepperInput.vue:18-23`. Deriving `valueLabel` from the longest shared
   character prefix of `decLabel`/`incLabel` silently produces garbage the moment a caller's
   labels don't share a lead-in. Better: an explicit `valueLabel` prop with the action labels
   derived from it — makes the invariant structural instead of inferred.

4. **[MEDIUM] `useId()` called inside `Array.map`.**
   `src/components/TeamDialog.vue:32` — `tabs.map(() => useId())` works only because `.map`
   runs synchronously during setup; it breaks the instant `tabs` becomes dynamic. Better: one
   `useId()` and derive `` `${id}-tab-${tab.id}` ``.

5. **[LOW] Non-reactive snapshot of a prop-derived value.**
   `src/components/ScoreDialog.vue:35` — `isPastKickoff` is evaluated once at setup; safe only
   because the dialog is remounted per open (`v-if` in App.vue), an invariant enforced two
   files away. Same latent assumption in `use-match-result-form.ts:20-29`. Make it computed or
   document the mount-constant contract at the prop.

6. **[LOW] Inline conditional-spread style object in template.**
   `src/components/BaseDialog.vue:41-44` — move to a `computed` `dialogStyle`.

7. **[LOW] Per-instance constants that should be module scope.**
   `src/components/SyncDialog.vue:17-23`, `src/components/StandingsRow.vue:26-33`,
   `src/components/ThirdPlaceRow.vue:24-29` — immutable lookup tables recreated per instance
   (StandingsRow mounts 48× on the groups page). `MatchCardMeta.vue:1-9` already demonstrates
   the right pattern (plain `<script>` block); apply it consistently.

### Consistency

1. **[MEDIUM] Three coexisting prop-declaration styles.** Bare `defineProps` (most files),
   `const props = defineProps` even when only template-used (`src/components/TeamFlag.vue:5`,
   `src/components/icons/CardIcon.vue:2` — which then write `props.size` in templates), and
   `withDefaults(...)`. Pick one convention (with 3.5: destructure when defaults/script access
   are needed, bare otherwise) and apply everywhere.

2. **[MEDIUM] `announce` breaks the provide/inject packaging convention.**
   `src/App.vue:36-46` vs `src/composables/use-team-viewer.ts:14-28`. Team viewer and score
   dialog encapsulate both halves (`provideX()` + `useX()` in one file); announce hand-rolls
   the provider side inline in App.vue. A `provideAnnounce()` in `use-announce.ts` restores
   symmetry and removes 10 lines from App.vue.

3. **[MEDIUM] `static` as a prop name is a strict-mode reserved word.**
   `src/components/MatchCard.vue:18`, `src/components/MatchCardMeta.vue:19`. The moment anyone
   adopts props destructure (above), `const { static } = defineProps…` is a syntax error. It
   also under-describes intent. Rename (`plain`, or inverted `interactive`).

4. **[LOW] Four names for "close this dialog".** `dismiss` (`UpdateDialog.vue:14`),
   `requestClose` (`SyncDialog.vue:43`), `close` (`ScoreDialog.vue:18`), `handleCancel`
   (`ConfirmDialog.vue:25`) — all do exactly `baseDialog.value?.close()`. One name.

5. **[LOW] Redundant `max-width="var(--dialog-width-sm)"` where it's already the default.**
   `ConfirmDialog.vue:43`, `SyncDialog.vue:53`, `PossibleTeamsDialog.vue:18` restate
   BaseDialog's fallback. The stringly-typed CSS-var prop API is also typo-prone with zero
   type safety; consider `size?: 'sm' | 'lg'`.

6. **[LOW] `cancel` event fired for non-cancellation closes.**
   `SyncDialog.vue:55,83`, `SettingsView.vue:148` — closing from the `done` state emits
   `cancel` → `cancelSync()`, "aborting" a completed request. Name the event `close` like
   every other dialog.

7. **[LOW] Prop-name drift between the score-dialog config and the component.**
   `use-score-dialog.ts:5-9` (`home`/`away`) vs `ScoreDialog.vue:9-13`
   (`homeTeam`/`awayTeam`), manually re-mapped at `App.vue:76-82`. Align the names and the
   call site becomes `v-bind="scoreDialogConfig"`.

8. **[LOW] Doubled BEM classes where only one side is styled.**
   `StandingsRow.vue:55-82`, `ThirdPlaceRow.vue:56-70` — every cell carries a component class
   plus a shared class, but the scoped styles use almost none of the component-prefixed ones
   (one is an e2e hook at `e2e/groups.spec.ts:89`). Keep the shared `standings-cell__*`
   classes plus an explicit test hook; delete the ceremony.

---

## 2. TypeScript

### Correctness-adjacent

1. **[HIGH] `isValidResult` never validates `shootoutWinner`.**
   `src/lib/persistence.ts:80-105`. The validator exists precisely to stop malformed
   imports/localStorage from reaching the engine, yet `shootoutWinner: 'banana'` (or `1`, or
   `{}`) passes. Downstream, `resolveTeamRef` (`src/lib/knockout.ts:55-56`) only checks
   truthiness before `=== 'home'`, so any truthy garbage silently makes the away team the
   shootout winner. Add
   `r['shootoutWinner'] === undefined || r['shootoutWinner'] === 'home' || r['shootoutWinner'] === 'away'`
   (and ideally reject it when goals aren't level or the match is a group match). No test
   exercises a corrupted value either — see §5.1.

### Conciseness

1. **[MEDIUM] `qualifyingAllocation` forces a caller to invert its own output.**
   `src/lib/third-place.ts:77-117`. `resolveThirdPlaceSlot` builds the group→slot map, then
   linearly scans `[...map].find(([, s]) => s === slot)` to invert it — when the answer is a
   direct lookup: `THIRD_PLACE_ALLOCATION[key][THIRD_PLACE_SLOT_HOST[slot]]`. Return the
   allocation record from the shared Annex-C walk; both consumers index it directly.

2. **[MEDIUM] Copy-pasted bounded-FIFO-cache boilerplate, including the comment.**
   `src/lib/standings.ts:55-82` and `src/lib/possible-teams.ts:70-162` carry identical
   `MAX_CACHE_SIZE`/oldest-key eviction blocks with a byte-identical comment. A tiny
   `boundedCache<K, V>(max)` helper deletes ~25 lines and one of the two clear functions
   (also helps §7.1).

3. **[MEDIUM] Hand-rolled set union with `lib: ES2025` enabled.**
   `src/lib/possible-teams.ts:225-230` (also 187-193). ES2025 ships
   `Set.prototype.union`: `return homeIds.union(awayIds)`.

4. **[MEDIUM] Feeder-kind predicate written out four times; inverse maps built independently.**
   `src/lib/bracket-graph.ts:13-33`. `kind === 'matchWinner' || kind === 'matchLoser'` appears
   at lines 13, 18, 31, 32; `prevMatchMap` and `nextMatchMap` are built separately despite
   being inverses. One `feederMatchId(ref)` helper and one pass.

5. **[LOW] Defensive re-check of an invariant `sortTeams` already enforces.**
   `src/lib/standings.ts:158-161` — the `flatMap` guard re-checks what tiebreakers.ts:159-163
   throws on. `sorted.map((t) => statsMap.get(t.id)!)` is honest and shorter.

6. **[LOW] Near-identical provide/inject scaffolding ×3.**
   `use-score-dialog.ts`, `use-team-viewer.ts` (and `use-announce.ts` as a variant): same
   `OpenFn`/`noop`/`provideX`/`useX` pattern. Three copies is the threshold where a generic
   `createOverlayContext<Args>()` pays off.

7. **[LOW] `onMatchHoverEnd` and `onTeamRefHoverEnd` have identical bodies.**
   `src/composables/use-bracket-highlight.ts:97-100` vs 107-110. One `onHoverEnd`.

### Modern TS 6 practices

1. **[MEDIUM] Stringly-typed `refKey` format duplicated across modules — textbook template-literal-type case.**
   `src/lib/bracket-graph.ts:4-8` mints `` `groupRank:${group}:${rank}` `` /
   `` `thirdPlace:${slot}` ``; `src/composables/use-origin-group-data.ts:37-39` hand-builds
   the same strings. The keys meet in the DOM (`data-ref-key`, queried in
   `use-bracket-connectors.ts:30`); drift breaks bracket highlighting with no compile error
   and no test failure. Better: export
   ``type RefKey = `groupRank:${GroupId}:${1 | 2}` | `thirdPlace:${ThirdPlaceSlot}` `` plus a
   `refKeyFor(ref)` builder from bracket-graph.ts; type the maps `Map<RefKey, string>`.

2. **[MEDIUM] Memoized shared arrays exposed as mutable `TeamStat[]` with mutable fields.**
   `src/lib/standings.ts:68` return type. The cache hands the *same* array instance to every
   caller (12 group tables, third-place ranking, bracket resolution, the store computed). One
   caller doing `standings.sort(...)` or `stat.points++` poisons the cache globally, and the
   types invite it. Return `readonly TeamStat[]` with `readonly` fields (mutable internal type
   during accumulation).

3. **[MEDIUM] Untyped route `meta`.** `src/router.ts:21,50` — `meta: { title: 'Gruppen' }` is
   unchecked and `to.meta.title` is `unknown`. One line fixes both sides:
   `declare module 'vue-router' { interface RouteMeta { title?: string } }`.

4. **[LOW] `Number(slotStr) as ThirdPlaceSlot` cast to recover what `Object.entries` erased.**
   `src/lib/third-place.ts:85`. Iterate the slots directly
   (`for (const slot of [1,2,…,8] as const satisfies readonly ThirdPlaceSlot[])`). Moot if
   §2-Conciseness-1 is taken.

5. **[LOW] `context.store as unknown as {…}` double cast.** `src/stores/tournament.ts:58` —
   `isValidResultsMap` already takes `unknown`; only `.reset()` genuinely needs the cast.
   Narrow it to that one call.

6. **[LOW] Same shape declared twice in two styles.** `src/lib/tiebreakers.ts:31-37` —
   `H2HStat` (interface) and `PointGDGF` (type alias) are identical. Delete one.

7. **[LOW] `toThirdPlaceKey(groups: GroupId[])` should take `readonly GroupId[]`.**
   `src/types/tournament.ts:59` — everything else in lib takes readonly arrays; `toSorted`
   doesn't mutate.

8. **[LOW] `possibleTeamsFor` returns `Set<Team>` its only consumer immediately spreads.**
   `src/lib/possible-teams.ts:247` — return `readonly Team[]`; dedup already happened at the
   id level.

### Consistency

1. **[MEDIUM] "All groups complete" predicate re-derived in three places.**
   `src/lib/knockout.ts:91`, `src/lib/third-place.ts:54`, `src/router.ts:13` — each writes
   `GROUP_IDS.every((g) => isGroupComplete(g, results))`. This is a named domain concept;
   export `isGroupStageComplete(results)` once.

2. **[MEDIUM] A composable imports its data types from a `.vue` component.**
   `src/composables/use-origin-group-data.ts:6` imports `OriginGroupData`/`OriginTeamRow`
   from `OriginColumn.vue`, inverting the type-flow direction used everywhere else. Move the
   shapes to a `.ts` module both import.

3. **[LOW] `syncResults(provider = defaultProvider, opts?)` argument order forces `undefined` at every real call site.**
   `src/lib/results-sync/index.ts:85-88`; both consumers write `syncResults(undefined, { signal })`.
   Take a single options object with optional `provider` (see also §7.4 — the parameter is
   arguably dead surface).

4. **[LOW] German display-label helpers split across two modules with no rule.**
   `src/lib/team-schedule.ts:6-24` carries `KNOCKOUT_STAGE_LABEL`/`matchStageLabel` while
   `bracket-labels.ts` exists. Consolidate label helpers; keep `team-schedule.ts` purely
   computational.

5. **[LOW] Field validation as two six-way boolean walls with `as number` re-casts.**
   `src/lib/persistence.ts:83-103`. One loop over
   `(['homeGoals','awayGoals',…] as const)` removes the casts and ~20 lines, and makes adding
   the `shootoutWinner` check (§2.1) trivial. (`Number.isFinite` inside
   `isNonNegativeInteger` is redundant next to `Number.isInteger`.)

6. **[LOW] Returned key `fetch` shadows global `fetch` in every consumer.**
   `src/composables/use-match-result-form.ts:137`. Rename to `liveFetch`.

---

## 3. HTML & accessibility

1. **[HIGH] Group-letter badge is hidden from assistive tech with no substitute.**
   `src/components/ThirdPlaceRow.vue:59` — `aria-hidden="true"` on the group letter, and in
   the "Beste Drittplatzierte" table group membership is the one piece of context not implied
   by heading/caption. Fold it into the existing visually-hidden status span
   (`Gruppe {{ stat.team.group }}, {{ statusLabel[status] }}`).

2. **[HIGH] 12 unlabeled, indistinguishable tab stops on the groups page.**
   `src/components/GroupStandingsTable.vue:14` — the focusable scroll wrapper
   (`<section tabindex="0">`) has no `aria-label`, while the identical pattern in
   `ThirdPlaceTable.vue:42` and `RankingView.vue:39` is labeled. Instantiated 12×. Add
   `aria-label="Tabelle Gruppe {{ groupId }}"`.

3. **[MEDIUM] Penalty-shootout outcome is invisible in match cards — visually and via AT.**
   `src/components/MatchCard.vue:46-55` — a knockout match decided on penalties (e.g. 1:1) is
   indistinguishable from an unresolved draw; the data exists and ScoreDialog uses it. Append
   "– im Elfmeterschießen: <Team>" to the label and show it visually.

4. **[MEDIUM] Numeric rank is `aria-hidden` with no accessible substitute.**
   `src/components/StandingsRow.vue:57` / `ThirdPlaceRow.vue:58` — a screen-reader user
   reading linearly never hears "1.", "2.". Merge rank into the visually-hidden status text.

5. **[HIGH] `MatchCardMeta` toggle is a ~20 px tap target.**
   `src/components/MatchCardMeta.vue:49-60` — no `min-height`, unlike literally every other
   interactive element in the app, all of which use `var(--tap-target)` (44 px). For an app
   aimed partly at children, this is the one target that's genuinely hard to hit. Add
   `min-height: var(--tap-target)`.

6. **[MEDIUM] Custom `role="spinbutton"` re-implements a native numeric input, 12 tab stops per dialog.**
   `src/components/StepperInput.vue:52-64` — 3 tab stops per stepper × 2 (ScoreInput) + 4
   (DisciplineInput), and no way to type an exact value. Consider a native
   `<input type="number" inputmode="numeric">` with the +/− buttons as enhancement, or
   document why the ARIA-widget route was chosen (first rule of ARIA).

7. **[MEDIUM] Raw emoji in accessible legend text.**
   `src/components/ScoreInput.vue:16` (`⚽ Tore`), `src/components/ScoreDialog.vue:49`
   (`🥅 Elfmeterschießen — Sieger`). Every other icon+label pairing in the app wraps the glyph
   in `aria-hidden="true"`; VoiceOver will verbalize "Fußball, Tore". Wrap the emoji.

8. **[MEDIUM] Dead `announce()` call that contradicts the comment two lines above it.**
   `src/composables/use-match-result-form.ts:117-119` — `fetchLive()`'s success announce
   targets the global live region while the modal dialog is open, which the file's own
   comment (lines 80–84) explains is inert in exactly this situation; `fetchMessage` was
   added as the correct fix. Delete the stale call.

9. **[LOW] `aria-hidden="true"` on a focusable native file input.**
   `src/views/SettingsView.vue:119-127` — the documented `aria-hidden-focus` anti-pattern.
   Drop `aria-hidden`; `tabindex="-1"` + visual clip already suffice.

10. **[LOW] axe gate doesn't include WCAG 2.2.**
    `e2e/support/a11y.ts:5` — `AXE_TAGS` stops at `wcag21aa`; 2.5.8 Target Size (which would
    have caught §3.5) is structurally invisible to the project's own a11y gate. Add
    `wcag22aa`.

11. **[LOW] `<article>` vs `<section>` drift for identical card components.**
    `src/components/GroupTable.vue:35` uses `<article aria-label>`; `BracketRound.vue:33`,
    `OriginColumn.vue:30`, `ThirdPlaceTable.vue:13` use `<section aria-label>`. Both work;
    the inconsistency suggests it wasn't a choice.

DOM minimality: no real findings — wrapper elements consistently earn their keep (flex/grid),
and shared classes (`surface-card`, `standings-cell__*`) are reused rather than re-nested.
The only template bloat is the triplicated table headers (§1-Simplicity-1).

---

## 4. Styling, UI & UX

### Mobile viewport & platform (most impactful)

1. **[HIGH] No `env(safe-area-inset-*)` anywhere in the codebase.**
   Zero grep hits. The sticky header (`src/components/AppHeader.vue:52-54`) and skip link
   (`src/styles/base.css:23-26`) will sit under the notch/Dynamic Island in the installed
   PWA, and scrollable views have no bottom inset for the home indicator. This app is
   explicitly a home-screen PWA; this is a real, visible defect on iOS.

2. **[HIGH] `min-height: 100vh` instead of `100dvh`.**
   `src/styles/reset.css:36` — the classic mobile URL-bar jump bug, in a mobile-first PWA.
   `dvh` is used nowhere. Related: dialog caps of `min(90vh, …)` in
   `src/components/TeamDialog.vue:62` and `PossibleTeamsDialog.vue:18` should be `90dvh`.

3. **[MEDIUM] Static `theme-color` doesn't track the theme.**
   `index.html:6` hardcodes the dark surface `#0f172a`; in light mode the OS chrome renders
   dark navy against an off-white app. Update the meta tag at runtime next to the
   `dataset.theme` write in App.vue.

4. **[MEDIUM] No anti-FOUC theme bootstrap.**
   `src/App.vue:22-32` applies the theme in a `watchEffect` after Pinia rehydrates. A user
   who picked "Hell" on a dark-OS device sees a dark flash on every cold start. Standard fix:
   a tiny synchronous inline script in `index.html` setting `data-theme` before first paint.

### UX clarity

5. **[HIGH] Standings tables are abbreviation walls** — see §9.7 (audience finding; also a
   styling finding since the `<abbr title>` affordance is hover-only, useless on touch).

6. **[MEDIUM] Destructive "Zurücksetzen" sits inline with harmless actions.**
   `src/views/SettingsView.vue:108-113` — Exportieren / Importieren / Ergebnisse abrufen /
   Zurücksetzen in one flex row, equal visual weight, differing only by outline color. The
   data-nuking action deserves its own separated section, not just a recolor.

7. **[MEDIUM] Only navigation entry point on mobile is a top-right hamburger** — see §9.5.
   Bottom tab bar solves reachability, discoverability, and always-visible location state at
   once.

8. **[LOW] Horizontal-scroll bracket has no scroll affordance.**
   `src/components/BracketView.vue:137-141` — no fade/shadow hint, no scroll-snap; a child
   has no cue that the K.-o.-Runde scrolls sideways.

9. **[LOW] "Click anywhere on the card" affordance is invisible.**
   `src/components/MatchCard.vue:32-34` — the whole body opens the score editor but only the
   pill gets hover treatment. Add a hover/pressed state to the body, or scope the click to
   the pill.

### Modern CSS & minimality

10. **[MEDIUM] Three near-identical stat-table header recipes (plus a fourth in SquadList).**
    `GroupStandingsTable.vue:83-98`, `TeamStats.vue:72-77`, `ThirdPlaceTable.vue:103-118`,
    `SquadList.vue:46-52` all redeclare the same `th` block. The codebase already knows the
    fix (`src/styles/standings-row.css`); extract a `.stat-table` utility.

11. **[LOW] ~15 near-identical inline `color-mix()` state layers.**
    `--state-hover/focus/pressed` are tokens, but every dialog and hover state recomputes
    `color-mix(in srgb, …)` inline across `base.css`, `ThemePicker.vue`, `AppHeader.vue`,
    `MatchScoreButton.vue`, `StepperInput.vue`, `AppNav.vue`. A couple of utilities would
    delete the duplication.

12. **[LOW] Flat 2015-style BEM everywhere despite an es2025 target.**
    No native CSS nesting in any `<style scoped>` block; the same browser set that runs
    ES2025 supports nesting. Not wrong — just inconsistent with the project's own
    modernity bar, and files like MatchCard.vue's 79-line style block would shrink.

13. **[LOW] Two "tablet-ish" breakpoints with no shared token.**
    `640px` (App.vue, AppHeader.vue, AppNav.vue) vs `49rem` (GroupsView.vue, well-justified
    in a comment). At minimum tokenize the thrice-repeated `640px`. Container queries would
    fit `MatchCard`/`GroupTable` (whose width already varies inside the `auto-fit` grid
    independently of the viewport) better than viewport media queries.

14. **[LOW] Token-scale strays.** `SquadList.vue:87` `font-weight: 500` (maps to no token),
    `base.css:142` hardcoded `font-weight: 700` in the file that defines the shared heading
    recipe, `standings-row.css:43` bare `2px` padding next to a token in the same
    declaration, `AppHeader.vue:118` `border-radius: 2px`. Everything else is disciplined;
    normalize these four.

15. **[LOW] Elevation and motion systems are defined but under-used for feedback.**
    `--elevation-*` never responds to press/hover; dialogs and the burger menu pop with no
    entrance/exit transition despite Material-flavored `--motion-*` tokens existing. Cheap
    wins: a lift on `MatchScoreButton`, a fade/scale on dialog open, a height/opacity
    transition on the menu.

16. **[LOW] Segmented-toggle look hand-rolled twice.**
    `ScoreDialog.vue:164-185` (shootout picker) and `ThemePicker.vue:53-90` build the same
    bordered/flex/active-filled pattern independently; the third copy is coming.

---

## 5. Tests

### Coverage

1. **[MEDIUM] The one hole in the corrupt-import armor: `shootoutWinner`.**
   `src/lib/persistence.spec.ts:69-77` fuzzes every numeric field but never a corrupted
   `shootoutWinner` — because the validator doesn't check it (§2.1). Add a case to the
   existing `it.each` table and a matching rehydration case in
   `src/stores/tournament.spec.ts` (which already covers 4 other corruption modes).

2. **[LOW] `assert-never.spec.ts` is coverage-filler.** A one-line throw helper whose only
   plausible regression is already caught by `tsc` at call sites; it reads like it exists for
   the 96 % gate. (Counterpoint kept deliberately: `tokens.spec.ts` and CardIcon's contrast
   assertions *look* like trivia but guard real regression classes — keep those.)

### Pyramid

3. **[MEDIUM] `e2e/knockout.spec.ts` re-derives structural facts `BracketView.spec.ts` already proves.**
   `e2e/knockout.spec.ts:25-30` (5 round headings) ⟷ `BracketView.spec.ts:44-48`;
   `:32-35` (32 cards) ⟷ `BracketView.spec.ts:52-80`; `:37-43` (final-column section labels)
   ⟷ `BracketView.spec.ts:117-129`. Zero-interaction static-render assertions belong in the
   component test; keep one e2e wiring check. Everything else in the pyramid is well-balanced
   — the interactive e2e specs test what unit tests genuinely can't.

### Design & consistency

4. **[MEDIUM] Factory opt-outs, including a shadowing duplicate.**
   `src/test-support/results.ts:4-15` exports `makeResult`; 14 files import it, but
   `src/stores/tournament.spec.ts:26-28` defines a **local function with the same name**,
   `src/composables/use-results-sync.spec.ts:9-17` defines a local `result()`, and
   `SettingsView.spec.ts:161`, `ScoreDialog.spec.ts:76-84`, `espn.spec.ts` hand-write full
   6-field literals. One `Result` shape change currently fans out to ~6 files.

5. **[MEDIUM] Four copy-paste tests next to a sibling that shows the fix.**
   `src/components/ScoreDialog.spec.ts:137-173` — four near-identical card-increment tests,
   while `DisciplineInput.spec.ts:35-47` tests the same four-way symmetry with `it.each`.

6. **[LOW] `e2e/support/results.ts` reimplements `src/test-support/results.ts` nearly verbatim.**
   `e2e/support/results.ts:8-10,34-38` — e2e support already imports `src/` modules
   (`fixtures-2026`, `STORAGE_KEY`), so it can import the factory too; today a `Result`
   change must be made twice to stay in sync.

7. **[LOW] The `findAll('button').find((b) => b.text()…)` idiom appears ~18 times with no helper.**
   `ScoreDialog.spec.ts` (13×), `ScoreInput.spec.ts`, `DisciplineInput.spec.ts`,
   `SyncDialog.spec.ts`. A one-line `findButtonByText(wrapper, text)` in test-support
   centralizes it and replaces the bare `!` assertions with a useful failure message.

Naming, file organization (1:1 spec/source mirroring), and the e2e page-object pattern are
uniform — no findings there.

---

## 6. Setup & tooling

### Linting

1. **[LOW] `lint` and `lint:fix` run the two engines in opposite order.**
   `package.json` — check runs oxlint→eslint, fix runs eslint→oxlint. Two fix engines
   touching the same files in reversed order is a footgun; align or document.

2. **[LOW] No type-aware linting despite an async-heavy codebase.**
   `eslint.config.js` uses non-type-checked `tseslint.configs.recommended`, so
   `no-floating-promises`/`no-misused-promises` are inactive; floating promises are caught by
   discipline only. A deliberate speed trade-off — but make it explicit.

3. **[LOW] Whole oxlint categories (`perf`, `pedantic`) off without a comment**, in a config
   that bothers to justify a single rule override (`unicorn/no-null`).

### TypeScript setup

The 6-tsconfig project-references structure is **correct and proportionate** (verified:
`vue-tsc -b --force` passes clean), and strictness is essentially maxed
(`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly`, …).
Two nits:

4. **[LOW] Three-way manual `target` sync.** `tsconfig.base.json:2`, `tsconfig.app.json:6`,
   `vite.config.ts` build.target each carry "keep in sync" comments with no enforcement.
   Known footgun; consider a tokens.spec-style guard test.

5. **[LOW] `tsconfig.vitest.json` sets `composite: false` while sibling leaf
   `tsconfig.e2e.json` sets `composite: true`** — works either way, pure inconsistency.

### PWA & bundle

6. **[HIGH] The flag-icons bundle defeats the offline-first performance story.**
   `TeamFlag.vue` imports `flag-icons/css/flag-icons.min.css` (28 KB source); Vite's default
   `assetsInlineLimit` (4096 B) inlines every small flag SVG as a data URI, producing a
   verified **421 KB** CSS chunk (`dist/assets/TeamLabel-*.css`) plus **3.8 MB** of hashed
   SVGs — many duplicated (4x3 *and* 1x1 variants of the same flag). TeamFlag/TeamLabel are
   used by StandingsRow, MatchTeamSlot, PossibleTeamsDialog, RankingView — this chunk is on
   the critical path of nearly every screen. Fix: `build.assetsInlineLimit: 0` (or below the
   smallest flag) so flags stay cacheable static files, and dedupe the variant set.

7. **[MEDIUM] size-limit budgets only watch the smallest, already-fine chunks.**
   `package.json` size-limit covers `index-*.js` (35 KB) and `index-*.css` (12 KB) — not the
   421 KB flag CSS or the 66 KB `TeamDialog-*.js` where the actual risk lives. A budget that
   ignores the lazy chunks gives false confidence.

8. **[MEDIUM] No runtime caching for the ESPN API.** `vite.config.ts` workbox config has only
   the navigation route; `site.api.espn.com` calls bypass the SW entirely. If falling back to
   persisted Pinia state is the intended offline story for sync, document that boundary.

9. **[LOW] Manifest is minimal.** No `screenshots` (blocks the richer install UI), no
   `categories`/`shortcuts`, and `apple-touch-icon` reuses `icon-192.png` instead of a
   dedicated 180×180.

### CI/CD

10. **[HIGH] Pre-push hook doesn't fail the push on `check:code` failure.**
    `.githooks/pre-push` is `npm run check:code` then `npm run check:build` with **no
    `set -e`** — in `sh`, a non-zero exit from the first command doesn't stop the script, and
    the hook's exit status is whatever the *last* command returns. A lint or unit-test
    failure sails through if the build+e2e happens to pass. Add `set -eu`.

11. **[MEDIUM] Pre-push duplicates 100 % of CI with no fast path.**
    Every `git push` pays build + both Playwright suites + size-limit twice (locally and in
    Actions), with no skip for docs-only changes. Make the hook `check:code` only and let
    CI own the expensive gate — or document why full duplication is intentional.

12. **[HIGH] No failure telemetry, no `<noscript>`, no legacy path — silent white screens.**
    ES2025 build target with no `@vitejs/plugin-legacy`/browserslist, no
    `app.config.errorHandler` / `window.onerror` / `unhandledrejection` hook anywhere in
    `src`, no error reporting. A user on an older device gets a blank page and the maintainer
    never learns it happened. Minimum: a `<noscript>` message and a global error handler
    (even a localStorage-logged one surfaced in Settings).

13. **[LOW] `renovate:validate` exists as a script but never runs in CI** — a broken
    `renovate.json` degrades silently. Wire it into the workflow.

14. **[LOW] Uploaded `dist` artifact has no `retention-days`** — every main push stores a
    build for the 90-day default although it's consumed within the same run.

### General setup

15. **[MEDIUM] The Python tooling is an ungoverned island.**
    The devcontainer pins Python 3.14.6 + `uv`, Renovate tracks the versions — all for
    `scripts/fetch-fifa-ranking.py` / `fetch-squads.py` (~350 lines of scraping/parsing that
    write generated `.ts` files), yet there is no ruff/mypy, no lint, no CI, no tests for
    them. The TS side has three quality tools on every push; the Python side has an
    `.editorconfig` indent width. Add `ruff check`/`ruff format` and wire into `check:code`.

16. **[LOW] No CSP even via `<meta>`** (the only mechanism on GitHub Pages). Tempered by zero
    `v-html`/`innerHTML` usage today, but there's no defense-in-depth if that changes.

17. **[LOW] Versioning is invisible.** `0.1.0` forever, no CHANGELOG, nothing in the UI —
    UpdateDialog says "an update exists" with no notion of what changed, and bug reports
    can't be pinned to a build.

18. **[LOW] ESPN dependency is the app's biggest "silently stops working one day" risk.**
    Undocumented, unauthenticated internal endpoint, no monitoring, no response-shape guard
    beyond the provider's parsing. Acceptable for a hobby project — flag it in the docs.

---

## 7. General engineering (SRP / SOLID / YAGNI / DRY / cohesion / comments)

1. **[MEDIUM] The store must know about and clear lib-internal module caches.**
   `src/stores/tournament.ts:30-40` — `reset()`/`importResults()` each call two lib-internal
   invalidators (`freePossibleTeamsMemory()`, `clearStandingsCache()`); the caches are
   module-level mutable Maps inside modules `docs/requirements.md` §3 calls "pure functions".
   Any future bulk-mutating action must remember both calls, and forgetting fails silently.
   Better: one `clearDerivedCaches()` facade in lib, or move memoization behind the store's
   computed (WeakMap keyed on `results` identity) so lib stays actually pure. Related:
   the double-caching cost analysis in §9.3.

2. **[MEDIUM] `refKey` seam** — see §2-Modern-1. Engineering angle: the two independent
   implementations meet only in the DOM, so the seam has no compile-time or test coverage.

3. **[MEDIUM] Bounded-cache duplication** — see §2-Conciseness-2.

4. **[LOW/MEDIUM] YAGNI in results-sync: the abstraction is right, its surface isn't.**
   `src/lib/results-sync/provider.ts` isolating ESPN's raw JSON behind `SourceMatch` is
   *justified* — keep the boundary. But `ResultsProvider.id` and `label` ("User-facing label
   (German)") are read nowhere, and `syncResults(provider = defaultProvider, opts?)` exists
   only for tests, which already have an injection seam via `FetchResultsOptions.fetchImpl` —
   two injection mechanisms for one need. Delete `id`/`label`, make it `syncResults(opts?)`,
   and let a second provider introduce the parameter when it exists.

5. **[LOW/MEDIUM] Two hand-rolled async fetch state machines.**
   `use-match-result-form.ts:75-125` and `use-results-sync.ts` implement the same
   status/error/abort machine twice with different status enums; `useMatchResultForm` also
   mixes four concerns (form state, store writes, a11y announcements, network fetch) in ~140
   lines. Extract a small `useAbortableFetch` core.

6. **[LOW] DOM coupling across components.** `use-bracket-connectors.ts:22,33` queries
   `'.match-card'`, a scoped style class owned by MatchCard.vue — a rename breaks the SVG
   connectors with no error. Use a dedicated `data-connector-anchor` attribute. Also: the
   bezier construction (lines 3-13) is the one piece of non-obvious math in the repo
   *without* a comment.

7. **[LOW] A comment that justifies an extraction with a lint rule that doesn't exist.**
   `use-origin-group-data.ts:13-16` claims the composable exists "purely to keep that
   component's `<script setup>` block under the lint's line limit" — no `max-lines` rule
   exists in `.oxlintrc.json` or `eslint.config.js`. A misleading *why* comment is worse than
   none. Same category: five references to the **deleted** REVIEW.md
   (`MatchCard.vue:68`, `OriginColumn.vue:37`, `AppHeader.vue:26`, `BracketRound.vue:42`,
   `possible-teams.spec.ts:129`) and one to the moved `REQUIREMENTS.md §9.8`
   (`persistence.spec.ts:52`).

8. **[LOW] Shared mutable cached objects** — see §2-Modern-2.

Explicitly checked and fine (anti-findings): the three stat-accumulation loops
(`standings.ts` / `tiebreakers.ts` / `team-schedule.ts`) compute different scopes per the
regulations — merging them would be over-DRY. The tournament store is *not* a god object
(65 lines, one piece of state). `src/lib` has zero Vue/Pinia imports (grep-verified).

---

## 8. AI / agent-friendliness

1. **[HIGH] CLAUDE.md is 10 lines and answers almost none of an agent's turn-one questions.**
   Both existing conventions (pin deps, non-mutating array methods) are good; missing:
   - **Verification workflow:** `check:code` as the one-shot gate; how to run a single test
     file (`npx vitest run src/lib/standings.spec.ts`); that `test:e2e:pwa` needs
     `npm run build` first; that the 96 % coverage gate means *new untested code fails
     `check:code`* — a classic agent trap.
   - **Architecture map:** `src/data (static) → src/lib (pure) → stores → composables →
     components`; "only `ResultsMap` is persisted, everything else derived".
   - **Domain glossary:** `TeamRef` kinds, Annex C / `THIRD_PLACE_ALLOCATION` ("source of
     truth — never recompute by intuition"), fair-play score, shootout modeling.
   - **Conventions living elsewhere:** UI strings German / code English (only in
     requirements.md §1); `src/data/squads.ts` and `fifa-ranking.ts` are **generated** by
     `scripts/*.py` — hand-editing them is a mistake an agent will absolutely make.
   - Pointers to `docs/requirements.md` and `docs/tournament-rules.md`.
   A ~60-line CLAUDE.md with those five sections transforms first-contact effectiveness.

2. **[HIGH] `docs/requirements.md` has drifted in at least five places while agents will trust it.**
   - §2/§8 claim `registerType: 'autoUpdate'`; code uses `'prompt'` + UpdateDialog
     (`vite.config.ts:25`) — the code is right, the doc is wrong.
   - §8 claims `navigateFallback` to index.html; code sets `navigateFallback: null` with a
     NetworkFirst route (`vite.config.ts:46-53`).
   - §6/§7.6 claim theme `'light' | 'dark'` default `'light'`; code has `'system'`, default
     `'system'` (`src/stores/settings.ts:4-9`).
   - §7.6 omits an entire shipped feature — the bulk "Ergebnisse abrufen" sync
     (`SettingsView.vue:14-21`, SyncDialog) that replaces all results; only the per-match
     fetch (§1) is documented.
   - §2 claims "one note file per significant dependency under `docs/`" — `docs/` has two
     files, neither per-dependency. §7 promises bottom navigation; the app has a hamburger.
     The preamble references a section that doesn't exist in the file.
   Fix the drift, then *reduce drift surface*: strip restated implementation detail
   (plugin options) the code already owns, and add a "last reconciled at commit …" header.

3. **[MEDIUM] Stop hook and permission allowlist have gaps against the actual CI gate.**
   `.claude/hooks/check-ts-vue.sh` is a genuinely good guardrail (~14 s: typecheck, lint,
   642 unit tests), but: it omits `format:check`, which **is** in CI's `check:code` — an
   agent can satisfy every Stop hook and still fail CI on formatting (add `npm run format`,
   auto-fix, to the chain); the dirty-check greps only `\.(ts|vue)$`, so edits to
   `.oxlintrc.json`, `eslint.config.js`, or `package.json` skip verification entirely.
   `.claude/settings.json:8-16` allowlists `Bash(npm run dev)` (long-running; will hang a
   foreground agent) but not the fast-iteration commands agents actually need:
   `Bash(npx vitest run:*)`, `npm run format:check`, `npm run check:code`.

4. **[MEDIUM] README's domain link is broken, part of a pattern.**
   `README.md:63` links `./REQUIREMENTS.md`; the file is `docs/requirements.md`. Together
   with the five REVIEW.md ghost references (§7.7): docs get moved/deleted, references don't.
   A markdown-link-check in CI ends the pattern.

5. **[MEDIUM] No project verify/run skills; only the vendored generic playwright-cli skill.**
   The knowledge an agent needs — `check:code` as verify; `test:e2e:pwa` needs a build first;
   pre-push runs the multi-minute `check:build`; dev on 5173 / preview on 4173;
   `DEPLOY_BASE_PATH` — exists only spread across README and two Playwright configs. Package
   it as project skills.

6. **[LOW] Repo hygiene for agents.** `.claude/scheduled_tasks.lock` is runtime junk, not
   gitignored (add `.claude/*.lock`); stale `coverage/`/`dist/` trees pollute naive greps;
   `defaultMode: "acceptEdits"` in the *checked-in* `.claude/settings.json` imposes
   auto-accepted edits on every contributor — that's a per-user preference for
   `settings.local.json`.

---

## 9. Functional review

### Domain correctness & complexity

Spot-check result: the Article-13 tiebreaker chain (H2H before overall GD, subset
re-application, no-restart d–f–g sequence), the third-place chain (pts → GD → GF → fair play
→ FIFA ranking, no H2H), the R32 slot mapping (M73–M88, `THIRD_PLACE_SLOT_HOST`), and all
495 entries of `THIRD_PLACE_ALLOCATION` (verified programmatically: key shape, source-group
membership, no duplicate assignments, per-host constraint sets matching the docs
line-for-line) are **correct**. The domain core's complexity is almost entirely inherent.
The problems are at the edges:

1. **[HIGH] Editing a group result silently re-attributes downstream knockout results.**
   `src/stores/tournament.ts:21` (`enterResult`), `src/lib/knockout.ts:25`. Scenario: all
   groups complete; user enters R32 M73 as 2:1; later fixes a typo in a Group A match that
   flips who finishes A2. M73's stored 2:1 now applies to a *different pairing* — bracket,
   R16 seeding, and team stats recompute as if the new team won, with zero warning.
   `MatchCard` only blocks entry while a side is *unresolved*, not when a recorded result's
   participants have *changed*. For a back-filling tracker (an explicit day-one use case,
   requirements §1) this is the most likely real-world data-corruption path. Better: on
   saving a result, diff resolved participants of downstream matches that have results;
   prompt to clear the invalidated ones.

2. **[MEDIUM] Destructive whole-tournament sync replaces manual entries.**
   `src/views/SettingsView.vue:21` (`store.importResults(results)`),
   `src/components/SyncDialog.vue:59`. "Ergebnisse abrufen" builds a fresh map from the ESPN
   feed and **replaces the entire store** — any match the feed is missing, mis-maps (the
   pair+date matching in `results-sync/index.ts` is heuristic), or that the user entered
   manually is destroyed. Also outside documented scope (requirements §1: live fetch is
   opt-in *per match*). Better: merge — only overwrite matchIds present in the feed; report
   "N Spiele aktualisiert".

3. **[MEDIUM] Double-layer standings caching; the fingerprint cache taxes the hot path that justifies it.**
   `src/lib/standings.ts:36-82` + `src/stores/tournament.ts:17-19`. Standings are memoized
   twice: the store's shared computed (which already deduplicates the reactive consumers)
   *and* a module-level fingerprint-keyed FIFO cache. During possible-teams enumeration
   every simulated combo is a guaranteed cache miss that still pays fingerprint string
   construction plus 200-entry Map churn — potentially hundreds of thousands of times. Keep
   one layer: an uncached fast path for the enumeration, or drop the store computed.

4. **[MEDIUM] The 1,000,000-combination synchronous enumeration budget will freeze mid-range phones.**
   `src/lib/possible-teams.ts:55`. At a realistic 1–4 µs per `computeGroupStandings` call
   that's 1–4 s of main-thread block. Concrete trigger: a lopsided/typo'd score (25:0) with
   2 matches remaining ⇒ cap 26 ⇒ 26⁴ ≈ 457k combos on a placeholder tap. Budget ~50–100k,
   or chunk via `requestIdleCallback`/worker.

5. **[LOW] `possibleTeamsFor` returns an empty set for a played-but-undecided knockout match.**
   `src/lib/possible-teams.ts:215-221` — a level knockout result without `shootoutWinner`
   (importable; cross-field consistency isn't validated, see §2.1) short-circuits to exact
   resolution, resolves `null`, and the dialog claims *no* team can fill the slot. Fall
   through to the home∪away union.

6. **[LOW] Dead feature residue: `TeamStat.form` computed, never rendered.**
   `src/lib/standings.ts:27,104,133-147` — three pushes per match in the hottest function
   for a removed feature the requirements (§7.1) still describe.

### Language & icons for young / close-to-non-readers

5. **[HIGH] Mobile navigation hides everything behind a hamburger.**
   `src/components/AppNav.vue:26-37` (display:none until `--open`),
   `src/components/AppHeader.vue:30-44`. On phones all four views sit behind an abstract
   three-line icon. A pre-reader can operate persistent icon tabs; they will never open a
   burger menu. The requirements themselves specify a bottom tab bar. This is the single
   biggest audience miss (also §4.7 for the thumb-reachability angle).

6. **[HIGH] The score dialog identifies teams by muted text only.**
   `src/components/ScoreDialog.vue:41-44`, `src/components/ScoreInput.vue:23-25`. The app's
   own design principle is "big flags as the primary identifier" (requirements §8) — honored
   everywhere except the one screen where a child *acts*. `ScoreInput` receives
   `homeTeam`/`awayTeam` and uses them only in aria-labels; the shootout buttons
   (`ScoreDialog.vue:51-68`) are text-only too. Put a large flag above each stepper and
   inside each shootout button. Same defect in `DisciplineInput.vue:20,35`: the Heim/Gast
   grouping exists only as `aria-label` — sighted users see two identical 🟨/🟥 columns and
   must guess left = home (and its aria-labels say "Heim"/"Gast" while ScoreInput's say the
   actual team names — an inconsistency within one dialog).

7. **[HIGH] Standings tables are abbreviation walls.**
   `GroupStandingsTable.vue:24-56`, `ThirdPlaceTable.vue:49-69`, `TeamStats.vue:15-46` —
   bare `Sp S U N T+ T- TD Pkt FP` headers whose full words exist only in hover `title`
   (useless on touch) and visually-hidden spans (useless for a sighted non-reader). The app
   already speaks icon elsewhere (⚽🟨🟥 in the explainer); use icon headers or a persistent
   legend, not just the FAQ disclosure that only the third-place table has.

8. **[MEDIUM] The most important number renders at 15 px.**
   `src/components/MatchScoreButton.vue:44` (`--font-size-sm`), `MatchCard.vue:146`.
   Requirements: "large score numerals (≥ 32 px mobile)". Only the dialog's steppers use
   `--font-size-score`; the entered result on every match card — what the family looks at
   all tournament — is 15 px. Digits are the one thing early readers *can* read; give them
   size.

9. **[MEDIUM] Abbreviation-heavy labels defeat early readers.**
   - "K.-o.-Runde" (`src/router.ts:27`, `AppNav.vue:7`): three punctuation marks in one nav
     label. "Finalrunde" or "Turnierbaum" is decodable.
   - "Sieger Sp. 73" (`src/lib/bracket-labels.ts:22-25`): "Sp." is opaque — and match numbers
     are rendered **nowhere** in the UI (MatchCard/BracketRound never show `match.id`), so
     even an adult can't locate "Spiel 73". Print the match number on each card and spell
     "Sieger Spiel 73".
   - "Bester 3. Platz" is identical for all eight slots and never says which groups feed it.
   - "Bosnien H." (`src/data/teams.ts:26`) — one cryptic period-abbreviation among clean
     names.

10. **[MEDIUM] Terminology drift across the otherwise solid German.**
    "Team" (`GroupStandingsTable.vue:26`) vs "Mannschaft" (`RankingView.vue:47`);
    "FIFA-Ranking" (`TeamDialog.vue:72`) vs "FIFA-Weltrangliste" (everywhere else);
    "(sicher)"/"(gefährdet)" (`StandingsRow.vue:26-33`) vs "(aktuell sicher)"/"(aktuell
    nicht sicher)" (`ThirdPlaceRow.vue:24-29`) for the same provisional concept — and bare
    "sicher" is semantically wrong after one matchday; "Update verfügbar"
    (`UpdateDialog.vue:27`) next to a button labeled "Aktualisieren".

11. **[LOW] Fair-play column shows an unexplained negative number.**
    `ThirdPlaceRow.vue:69`, header "FP" (`ThirdPlaceTable.vue:63`) — the child-friendly
    explainer says "wer weniger Karten hat, gewinnt", but the cell shows a weighted score
    ("−4") the explainer never mentions. Show card counts (🟨3 🟥1) or explain the score.

12. **[LOW] A timestamp secretly doubles as a toggle button.**
    `src/components/MatchCardMeta.vue:33-44` — in the bracket, the kickoff row is a button
    that pins connector highlights; no affordance, and a child tapping the date expects the
    score dialog. Combined with the mouse-only OriginColumn hover sync
    (`OriginColumn.vue:50-51`), the entire highlight feature is invisible on touch — where
    this app will live. See also §9-scope-4.

### Feature scope

1. **[MEDIUM] No "today's matches" entry point for the core loop.**
   The core daily use case — "the match we just watched: enter the score" — requires knowing
   which of 12 groups the team is in, or scanning bracket columns. No by-date view, no
   "Heute" strip, no visual marker on today's fixtures. Every real tournament app leads with
   the matchday; this absence hurts the core use case more than any listed feature helps.

2. **[LOW] The full 211-row FIFA world ranking occupies one of four nav slots.**
   `src/views/RankingView.vue` — points to two decimals for Bhutan is tiebreaker trivia, not
   "track results / standings / bracket". Demote to a link from the tiebreaker explainer;
   free the slot for a "Heute" tab.

3. **[LOW] No payoff when the final is entered.**
   After M104 the bracket just shows one more filled card. For this audience the whole point
   of a month of data entry is "🏆 Weltmeister!". A champion banner is a trivial, high-joy
   addition.

4. **[LOW] The desktop-hover bracket connector/pin subsystem is ~250 LOC of polish whose primary interaction doesn't exist on the target devices.**
   `use-bracket-highlight.ts`, `use-bracket-connectors.ts`, `bracket-graph.ts`,
   `BracketConnectors.vue` — ResizeObserver geometry + SVG beziers for a hover affordance
   reachable on touch only via the hidden timestamp pin (§9-Language-12). Either make the pin
   discoverable or cut the subsystem.

---

## 10. Genuinely good (kept deliberately short, but these are real)

1. **The domain core is correct, and honest about its deviations.** The 2026 Article-13
   chain — including the subtle H2H-before-GD reorder and the Step-2 no-restart rule — is
   implemented correctly and documented *at the point of implementation*
   (`src/lib/tiebreakers.ts` header maps code paths to regulation criteria a–g). The Annex-C
   table is verbatim FIFA, 495/495 entries verified consistent. Simplifications (fair-play
   weights, ranking-instead-of-lots) are declared in `docs/tournament-rules.md`, not hidden.

2. **One persisted map, everything else derived — and hydration is guarded.** Only `results`
   is stored; standings, third-place ranking, and the whole bracket are pure functions of
   it. Export/import/reset are trivially safe, and rehydration goes through the same
   validator as file import (`stores/tournament.ts` `afterHydrate`) — defensive thinking
   most codebases skip.

3. **Type-driven domain modeling.** `TeamRef` as a discriminated union with `assertNever`
   exhaustiveness at every switch; `GroupMatchSlot` narrowing `homeRef`/`awayRef` to
   `ResolvedTeamRef` so "group matches are always concrete" lives in the type system;
   branded `ThirdPlaceKey`; `GroupId`/`TeamId` derived from `as const` data so runtime data
   and types cannot drift. Near-maximal tsconfig strictness (`exactOptionalPropertyTypes`,
   `noUncheckedIndexedAccess`, `erasableSyntaxOnly`) that the code genuinely conforms to.

4. **Accessibility is engineered, not sprinkled.** Native `<dialog>` + `showModal()` for
   every modal (no focus-trap library, no z-index wars), with ConfirmDialog's `wasConfirmed`
   folding Escape/backdrop/cancel into one path; route-change focus + polite announcement in
   App.vue; the team *understood* the `showModal()`-inert-live-region trap and built
   SyncDialog's persistent `role="status"` and ScoreDialog's `fetchMessage` around it;
   status colors always paired with text; reduced motion honored globally and per-animation;
   contrast comfortably AA in both themes (spot-checked).

5. **Comment discipline where it counts.** The workbox block in `vite.config.ts:36-85`, the
   `afterHydrate` rationale, the "dead-looking but load-bearing" `void measureVersion.value`
   note (`use-bracket-highlight.ts:64-66`), the enumeration-budget analysis
   (`possible-teams.ts:48-55`), and the 49rem grid-math derivation (`GroupsView.vue:37-49`)
   are model *why* comments.

6. **Test suite substance.** Domain tests include a documented regression test for a
   combinatorial-explosion bug with a runtime budget assertion
   (`possible-teams.spec.ts:127-166`) and a cache-key correctness test tied to a historical
   bug; `data.spec.ts` treats static fixture data as a real risk surface (104 unique match
   ids, no dangling refs, all 495 allocation combinations); `persistence-contract.spec.ts`
   keeps the e2e localStorage-seeding shortcut honest against the real persistence plugin;
   e2e page objects are uniformly designed and specs never bypass them.

7. **Toolchain discipline.** The oxlint/eslint layering via `buildFromOxlintConfigFile` is
   the officially recommended pattern, not accidental duplication; exact-version pinning is
   enforced everywhere (npm, `.nvmrc` + `engines` + `packageManager`, devcontainer ARGs,
   SHA-pinned GitHub Actions, Renovate-tracked); the GH-Pages SPA/PWA interplay
   (404-redirect trick, `handlerDidError` fallback, disabled `navigateFallback`) solves
   three non-obvious problems correctly and documents each.
