# Technical Review — World Cup 2026 Tracker

A critical, improvement-focused technical assessment of the app (Vue 3 + TypeScript +
Pinia PWA). Findings are grouped by topic; within each topic they are ordered by
relevance (**Critical → Major → Minor**). Positive aspects are deliberately omitted.

File references use `path:line`. A handful of cross-cutting claims were verified
directly against the source (noted inline as _verified_).

---

## 0. Highlights — fix these first

These have the highest payoff or represent active breakage:

1. **`possible-teams.ts` has two silent correctness bugs** (under-approximation of
   reachable ranks; memo cache ignores cards). For an app whose entire reason to exist
   is "compute the standings correctly," these are the worst findings. → §2 Critical
2. **The e2e suite is broken against the current source and almost certainly not run in
   CI.** Three tests assert removed status-badge markup; ~10 tests assert an `<h1>` that
   doesn't exist on two views. _verified_ → §5 Critical / §3 Critical
3. **`computeGroupStandings` — the core aggregation — is never directly tested.** Its
   spec re-implements the production loop and asserts against the copy. → §5 Critical
4. **`MatchCard` is a `role="button"` containing real buttons** — invalid ARIA nesting
   that hides controls from assistive tech. → §3 Critical
5. **Two divergent scroll-lock mechanisms** coexist (a composable + a hand-rolled
   `position:fixed` watcher), a latent body-style-clobbering bug. → §1 Critical
6. **The design system is half-wired**: Card/Dialog/Button surfaces are copy-pasted
   across 8+ components; the token file's "components never hardcode raw values" claim is
   false. → §4 Critical

---

## 1. Vue Components & Composables

### Critical

- **Two competing, divergent scroll-lock implementations.**
  `composables/use-scroll-lock.ts` locks via `overflow:hidden` with a ref count and is
  used by `ConfirmDialog`/`ScoreDialog`/`PossibleTeamsDialog`. But `TeamLabel.vue:18-31`
  hand-rolls a *different* lock (`body.position:fixed` + `top` + `scrollTo`) in a
  `watch`, and `SquadDialog` (which it opens) calls neither. The two strategies mutate
  overlapping body styles with no shared counter; if a squad dialog ever opens while an
  `overflow:hidden` lock is active they clobber each other's inline styles on teardown,
  leaving the page stuck-locked or mis-scrolled. **Fix:** delete the `TeamLabel` watcher;
  have `SquadDialog` use `useScrollLock`; fold the preserve-scroll behaviour into the one
  composable if it's actually wanted.

- **`BracketView.vue` is a god component** (306 lines) mixing two unrelated
  responsibilities: tournament data assembly (`toRow`, `rounds`, four lookup maps,
  highlight derivation) **and** raw DOM geometry (`getBoundingClientRect`/`scrollLeft`
  SVG path math in `makePath`/`makeOriginPath`/`buildAllPaths`, lines 146-216). The data
  half can't be unit-tested without a DOM; the geometry half can't be reused. **Fix:**
  extract a `useBracketConnectors(roundsEl, viewEl)` composable for the geometry; leave
  `BracketView` to wire rounds + events.

### Major

- **The stepper/counter widget is copy-pasted six times.** `DisciplineInput.vue:17-111`
  has four near-identical `−ㅤvalueㅤ+` blocks (~95 lines); `ScoreInput.vue:19-65` has two
  more. Any change to the stepper must be made in six places. **Fix:** one
  `<StepperInput v-model :min :label>` component used in all six spots.

- **Unnecessary reactivity over static data.** In `BracketView.vue`, `nextMatchMap` (63),
  `prevMatchMap` (73), `teamRefToMatchId` (91) and `matchToRefKeys` (103) are `computed`
  but depend only on the frozen static import `knockoutMatches`. They set up reactive
  effects that can never re-fire. **Fix:** make them plain module-level constants computed
  once.

- **Cargo-cult reactivity hack.** `BracketView.vue:33-34`:
  `const r = store.results; void r // ensure reactivity`. `toRow` already reads
  `store.results[match.id]` synchronously in the same computed, so the dependency is
  tracked. Delete both lines and the comment.

- **Name shadowing.** `BracketView.vue:149,175` declare a local DOM element `const rounds`
  that shadows the module-level `rounds` *data* computed (line 32) — same identifier, two
  meanings in one file. Several functions also name a `TeamRef` parameter `ref`
  (`r32RefKey`, `GroupTable.vue:23 resolveTeam`), shadowing Vue's imported `ref`. Rename
  to `roundsContainer` / `teamRef`.

- **Duplicated path builders.** `makePath` (146) and `makeOriginPath` (172) in
  `BracketView.vue` are ~95% identical, differing only in how `fromEl` is located.
  Collapse to one `connectorBetween(fromEl, toEl)` helper.

- **`BracketRound.vue` re-derives data it was handed.** Each `MatchRow` already carries
  resolved teams/placeholders, yet `BracketRound:36-57` re-imports the store and re-runs
  `resolveTeamRef`/`teamRefLabel`, and owns the possible-teams dialog + business logic. A
  presentational "round column" reaching into the store. **Fix:** lift the dialog to
  `BracketView` (which owns the store) and emit a `placeholderClick`.

### Minor

- **Dead components (YAGNI).** `OutcomeBadge.vue` and `PagePlaceholder.vue` are imported
  nowhere (_verified_; `PagePlaceholder`'s own comment says "Temporary scaffold"). They
  add test/CSS surface for nothing — delete them.
- **`AppNav.vue:8-13` duplicates router metadata** — hard-codes `to`+`label` that already
  exist as route `path`+`meta.title` in `router.ts`. Derive nav entries from the router.
- **`MatchCard.vue`**: `:aria-label="ariaLabel()"` (57) calls a function every render
  instead of a `computed`; `kickoffFmt` (19-25) builds a fresh `Intl.DateTimeFormat` per
  card instance (100+ cards = 100+ formatters). Make `ariaLabel` a computed; hoist the
  formatter to module scope.
- **Awkward decrement indirection.** `ScoreInput.vue:12-14` / `DisciplineInput.vue:7-9`
  pass a setter lambda for `−` while `+` is written inline — inconsistent and unnecessary
  with `defineModel` (`x = Math.max(0, x - 1)`). Moot once the stepper component owns
  clamping.
- **`SettingsView.vue`** models one "pending confirmable action" with two always-paired
  refs (`pendingAction` + `pendingImportResults`); a single discriminated-union ref makes
  the invariant unbreakable.
- **Weak lookup typing.** `SquadList.vue:7,14` types `POSITION_LABEL`/`POSITION_ORDER` as
  `Record<string, …>` with `?? 99` fallbacks, when `Player.position` is a finite union —
  `Record<Position, …>` would catch gaps at compile time.

---

## 2. TypeScript, Business Logic & Architecture

### Critical

- **`possible-teams.ts` silently *under*-approximates reachable ranks.**
  `maxGoalsPerSide` (34-38) caps simulated scorelines at 0–6/0–3/0–2 depending on matches
  remaining, but the file header (4-7) promises it "collects *every* team that can achieve
  the target rank in at least one scenario." A team that can only reach rank 1/2/3 via a
  large goal-difference swing (e.g. a 7-0 win) is **wrongly excluded** → the UI declares a
  still-alive team eliminated. Worse, `possibleThirdPlaceTeamIds` calls
  `possibleGroupRankTeamIds(group, 3, …)`, so the false-negative leaks into third-place
  chips too. Note the `thirdPlace` path explicitly *over*-approximates (the safe
  direction); this path does the opposite without admitting it. **Fix:** size the goal cap
  from the actual max GD any team must overturn (small for a 4-team group), or at minimum
  be honest in the docstring.

- **`possible-teams.ts` memo fingerprint ignores cards → stale wrong results.**
  `groupResultFingerprint` (44-54) encodes only `${homeGoals}:${awayGoals}` per match, but
  `sortTeams` breaks ties on `fairPlayScore` (yellow/red cards). Two result maps with
  identical goals but different cards collide on the same cache key; the first computed
  result is served to the second. Silent correctness bug whenever fair-play decides.
  **Fix:** include discipline counts in the fingerprint (and decide deliberately how
  enumerated hypothetical matches — which zero out cards at 90-97 — interact with this).

### Major

- **Cluster-by-3-criteria logic is copy-pasted ~20 lines.** `tiebreakers.ts:74-104`
  (`clusterByH2H`) vs `145-178` (`sortTeams`) implement the same "sort by
  (points, GD, GF) then group equal-key runs" loop almost verbatim, including the same
  `current[current.length-1]!` trick and comment. The `(points, GD, GF)` comparator
  appears a *third* time in `third-place.ts:23-27`. **Fix:** one generic
  `clusterBy<T>(items, keyFns)` + a shared `compareByPointsGdGf`.

- **`isGroupComplete` defined twice, byte-for-byte** (`third-place.ts:18-20`,
  `knockout.ts:20-22`). Both also re-filter `groupMatches` by group on every call (also
  done in `standings.ts:32`, `possible-teams.ts:66`) — O(72) repeated work on hot paths.
  **Fix:** export one predicate + a memoized `matchesByGroup` map.

- **Magic topology constants with non-null assertions.** `third-place.ts:42`
  `standings[2]!` ("third-placed team") assumes every group has ≥3 teams; `:55`
  `ranked.slice(0, 8)` hard-codes "8 best thirds advance"; same pattern in
  `standings.ts:105`. The `!` turns a structural assumption into an unchecked runtime
  `undefined`. **Fix:** named constants (`THIRD_PLACE_INDEX`, `QUALIFYING_THIRDS`) with a
  rationale; prefer `.at(2)` + explicit guard over `[2]!`.

- **Module-level mutable cache in a "pure" lib.** `possible-teams.ts:44`
  `const cache = new Map(...)` is never cleared, grows for every board state explored in a
  session, and makes the function impure (harder to test/reason about — see the memo bug
  above). **Fix:** bound it (LRU/size cap) and reset on store `reset()`/`importResults()`,
  or scope it per-call.

### Minor

- **`persistence.ts:49-65` accepts garbage numbers.** `isValidResult` checks
  `typeof === 'number'` but not finite/integer/sign, so `{homeGoals:-3.5, awayGoals:NaN}`
  passes the *untrusted import boundary* and `NaN` poisons all downstream comparisons.
  Reject non-finite / negative / non-integer.
- **Redundant `| null` on an optional field.** `types/tournament.ts:89`
  `penaltyWinner?: 'home'|'away'|null` — `?` already admits `undefined`; consumers
  (`knockout.ts:56`, `persistence.ts:64`) treat both identically. Drop `| null`.
- **Dead type assertion.** `possible-teams.ts:125` `as GroupId` is unnecessary
  (`alloc[hostGroup]` is already `GroupId|undefined`, narrowed by the preceding `if`) and
  would mask a real error if the table type changed.
- **Convoluted type for `Team`.** `standings.ts:9`
  `team: ReturnType<typeof teamsInGroup>[number]` spells `Team` the hard way and couples
  `TeamStat` to a data-function signature. Just `team: Team`.
- **Version coupling.** `persistence.ts:3 CURRENT_VERSION = 1` and
  `stores/tournament.ts:31 key: 'wc2026:results:v1'` independently encode "schema v1" and
  must change together with no shared constant.
- **`THIRD_PLACE_ALLOCATION` keyed as bare `string`** (`fixtures-2026.ts:853`); the
  load-bearing `if (!allocation) return null` guard (`third-place.ts:62`) is easy to
  forget. A branded `ThirdPlaceKey` would localize the contract.
- **No exhaustiveness guards.** `switch (ref.kind)` in `knockout.ts:29`,
  `possible-teams.ts:152`, `bracket-labels.ts:5` rely on every case returning. Add
  `default: { const _x: never = ref; throw … }` so a new `TeamRef` variant fails loudly at
  the right spot.

---

## 3. HTML Semantics & Accessibility (ARIA / a11y)

### Critical

- **Two of four views have no `<h1>`** (_verified_). `GroupsView.vue` and
  `KnockoutView.vue` render no `<h1>`; the first heading is an `<h2>`
  ("Gruppe A" / round labels). Only `RankingView` and `SettingsView` have one.
  WCAG 1.3.1 / 2.4.6 — heading navigation lands on a page with no top-level identity and
  the hierarchy jumps to h2. **The route-change live announcement is not a substitute for
  a persistent heading.** This *also* makes ~10 e2e assertions
  (`getByRole('heading', {level:1, name:'Gruppen'|'K.-o.-Runde'})`) currently fail
  (_verified_). **Fix:** add a per-view `<h1>` (visually-hidden if the design has no room).

- **`MatchCard` is a `role="button"` containing real buttons.** `MatchCard.vue:51-93` is
  `<div role="button" tabindex="0">` wrapping the team `<button>`s (`TeamLabel.vue:41-49`,
  "Kader anzeigen") and the placeholder `<button>` (70, 88). A button must not contain
  interactive descendants (WCAG 4.1.2) — AT behaviour is undefined; some screen readers
  collapse the children into the button name and never expose them. The `@click.stop`
  patches the mouse path only. **Fix:** make the card a plain container with a dedicated
  "Ergebnis bearbeiten" `<button>` as a *sibling* of the team buttons.

### Major

- **Qualification status is conveyed by colour alone.** `StandingsRow.vue:12-81` maps a
  `status` (qualified/safe/third/eliminated/…) to only a coloured border + tint; nothing
  reaches AT. WCAG 1.4.1 / 1.3.1. Same for `OriginColumn.vue` eliminated rows
  (`opacity:0.4` only). **Fix:** surface status as a visually-hidden cell or `aria-label`.

- **Theme radios have no visible focus indicator.** `SettingsView.vue:99-108` uses
  `<input type="radio" class="visually-hidden">` in a `<label>` with no
  `:focus-within`/`:focus-visible` rule, so keyboard focus is invisible. WCAG 2.4.7.
  **Fix:** `.theme-option:has(:focus-visible){ outline … }`.

- **Bracket hover-highlighting is mouse-only.** Connector highlighting is driven solely by
  `@mouseenter`/`@mouseleave` (`OriginColumn.vue:86-99` rows are plain `<div>`s with no
  tabindex/role/key handler; `BracketRound.vue:70-76`; `BracketView.vue:264-265`).
  WCAG 2.1.1 — keyboard/touch users never get the "which match feeds which" affordance.
  **Fix:** mirror with `@focusin`/`@focusout` and make rows focusable.

- **Landmark spam with duplicate names.** `GroupTable.vue:35,62` wrap each group in
  `<section aria-label="Tabelle">` and `<section aria-label="Spiele">`; ×12 groups = 24
  identically-named `region` landmarks. WCAG 1.3.1 / 2.4.1. **Fix:** use plain `<div>` (the
  surrounding `<article aria-label="Gruppe A">` already names it) or make labels unique.

- **Kickoff time dropped from the match card's accessible name.** `MatchCard.vue:31-38`
  builds `aria-label` from teams + score only; the visible `<time>` (63-65) sits inside
  the `role=button` and is overridden, so AT users can't disambiguate fixtures. (Resolves
  naturally once the card stops being a button.)

### Minor

- **Tables lack `<caption>` and row headers.** `GroupTable.vue:36`, `SquadList.vue:26`,
  `RankingView.vue:39` have no `<caption>`; the team-name cell is `<td>` not
  `<th scope="row">` (`StandingsRow.vue:27` etc.). Add a visually-hidden caption and
  promote the team cell.
- **Flags announced redundantly.** `TeamFlag.vue:13` is `role="img" :aria-label="name"`;
  where a flag sits beside the visible country name (`OriginColumn.vue:101`,
  `PossibleTeamsDialog.vue:49`, `RankingView.vue:60`, `SquadDialog.vue:31`) AT reads the
  name twice. WCAG 1.1.1 — add a "decorative"/`aria-hidden` mode for those cases.
- **Redundant ARIA.** `aria-modal="true"` on every native `<dialog>` opened via
  `showModal()` is redundant (`ConfirmDialog.vue:47`, `ScoreDialog.vue:77`, etc.);
  `SettingsView.vue:98` nests a `role="group"` directly inside a `<fieldset>`.
- **Counter live regions announce bare numbers** ("1", "2") with no team/card context
  (`ScoreInput.vue:30,55`, `DisciplineInput.vue:30,52,78,100`) — six live regions risk
  announcement pile-ups. Rely on the buttons' own `aria-label`s instead.
- **`DisciplineInput` card block is not a labelled group** (a `<p>` + `<span>`s), unlike
  `ScoreInput`'s `role="group" aria-label="Tore"` — inconsistent. Use `<fieldset>`/`role=group`.

---

## 4. CSS & Material-Design Alignment

> The token file's header claims _"Components pull from these custom properties; they
> never hardcode raw values."_ That claim is false; most findings below are the gap between
> that aspiration and the code.

### Critical

- **Card/Dialog surface recipes copy-pasted across 8+ components.** The identical
  card elevation block (`surface` bg + `radius-lg` + `1px border` + `shadow-md` +
  `overflow:hidden`) is hand-written in `BracketRound.vue:105`, `GroupTable.vue:85`,
  `OriginColumn.vue:110`, `RankingView.vue:103`; the dialog recipe is duplicated verbatim
  in all four dialogs. There is no "Card" or "Dialog" abstraction. **Fix:** a shared
  `.surface-card`/`.dialog` class (or wrapper) / `--elevation-*` aliases.

- **Dialog backdrop is a hardcoded magic value, duplicated 4×.** `rgb(0 0 0 / 0.5)` is
  hand-typed in all four dialogs and bypasses theming entirely. **Fix:** add a
  `--color-scrim` token (MD scrim is typically ~32%, not 50%).

- **No motion system.** `tokens.css` has no duration/easing tokens; only two elements
  animate (both hardcoded `0.15s`), `ScoreDialog.vue:230` sets `transition:none`, and every
  other hover/active state snaps instantly. MD treats motion as first-class
  (standard easing, 100–300ms, state-layer cross-fades). **Fix:** add `--motion-*` /
  `--ease-standard` tokens and apply uniform transitions (guarded by the existing
  `prefers-reduced-motion`).

- **"No hardcoded values" is violated pervasively.** Fixed widths (`26rem`, `17rem`,
  `7rem`, `6rem`, `10rem`), border widths (`2px`/`4px`), outline widths, `letter-spacing`,
  `opacity`, `font-size:0.75rem`, and an 11-value `color-mix` opacity ladder are all raw.
  **Fix:** tokenize border/outline width and sizing steps, or delete the misleading
  comment.

### Major

- **State-layer opacities are an 11-value free-for-all.** `color-mix(... X%, transparent)`
  uses X ∈ {4,6,7,8,10,12,15,18,20,25,45}% across components; hover tint differs between
  nav, cards, counter steps and table rows. MD specifies a fixed ladder (hover 8 / focus
  12 / pressed 12 / dragged 16). **Fix:** `--state-hover/-focus/-pressed` tokens aligned to
  MD.
- **Focus-ring spec contradicted by half the components.** `base.css:16` sets
  `3px`/offset `2px`; `MatchCard.vue:115`, `TeamLabel.vue:88`,
  `PossibleTeamsDialog.vue:135` redefine it as `2px` with varying offsets.
  `MatchCard.vue:112-121` even sets then removes an outline. **Fix:** one tokenized
  definition; let global `:focus-visible` do the work.
- **Three buttons, three reimplementations.** `.confirm-dialog__btn`,
  `.score-dialog__btn`, `.settings-view__btn` each re-declare the same base button, and the
  `--danger` variant is written independently three times. **Fix:** `.btn` +
  `.btn--primary/secondary/danger` or a `BaseButton.vue`.
- **Two counter widgets with divergent, sub-spec sizing.** `ScoreInput` step buttons use
  `--tap-target` (44px); `DisciplineInput.vue:167` hardcodes `2.25rem` (36px) — below the
  project's own token *and* MD's 48px minimum; `MatchCard.vue:203` placeholder has no
  minimum at all. **Fix:** one `Stepper` component sized to `--tap-target` (consider raising
  it to 48px).
- **Elevation doesn't follow MD and is applied inconsistently.** Resting cards use
  `shadow-md` (`0 4px 12px`, an MD elevation-3+ shadow) on static content; the sticky
  header uses `shadow-sm` and never elevates on scroll; there's no semantic
  card/menu/dialog/FAB mapping. **Fix:** a real `--elevation-1..5` scale; lighten resting
  cards.
- **Responsive design is single-breakpoint.** Exactly one `min-width:640px` query, used in
  two places; the bracket is a fixed `26rem`/`17rem` horizontal scroller, content columns
  cap and never reflow, the type scale never adapts. **Fix:** a small breakpoint set; scale
  bracket/card widths at md/lg.
- **Dark-mode tokens quadruplicated.** `tokens.css` defines the light palette in `:root`
  *and* `[data-theme='light']`, and dark in `@media(dark)` *and* `[data-theme='dark']` —
  four blocks, two value sets, a maintenance trap. **Fix:** define each palette once and
  share via selector lists.

### Minor

- **Dead CSS** ships with the unused `OutcomeBadge.vue`/`PagePlaceholder.vue` (the latter
  is the only consumer of `--font-size-xl`).
- **Unused tokens:** `--radius-full`, `--font-size-2xl`, `--space-8` are referenced by zero
  components.
- **`!important` to dodge specificity** in `GroupTable.vue:128-129`, `RankingView.vue:132,136`.
- **Fragile alignment hack:** `ScoreInput.vue:137 padding-top:1.8rem` to nudge the `:`
  separator — use baseline alignment.
- **Off-scale typography:** `OutcomeBadge.vue:28 font-size:0.75rem` (below the smallest
  token); raw `line-height:1.2` overrides and raw weights (`500/600/700`, 38×) with no
  weight tokens.
- **Unscaled `z-index` magic numbers** (`1`, `10`, `100`) — add a `--z-*` scale before a
  4th layer appears.

---

## 5. Test Coverage & Quality

### Critical

- **The e2e suite is broken against current source — and almost certainly not run in CI.**
  - Three tests assert status-badge markup deleted ~10 commits ago (`.match-card__status--*`
    no longer exists in `src/`, _verified_): `groups.spec.ts:51,67`, `knockout.spec.ts:166`.
    They will hang to timeout and fail.
  - ~10 tests assert `getByRole('heading', {level:1, name:'Gruppen'|'K.-o.-Runde'})`
    across `smoke`, `groups`, `pwa-offline`, `squads` — but those `<h1>`s don't exist
    (_verified_; see §3 Critical). That a removed feature's tests still ship "green" is
    strong evidence e2e isn't gating anything. **Fix:** delete/repair the badge tests, add
    the missing `<h1>`s, and get e2e into CI.

- **`computeGroupStandings` — the core aggregation — is never directly tested, and its
  spec lies.** `standings.spec.ts` header claims to test `computeGroupStandings` but imports
  `sortTeams` directly and **re-implements the production aggregation loop in a local
  `buildStats` (51-83)**, then asserts `sortTeams` against that copy. So
  `played`/`wins`/`form`/`goalsAgainst`/card aggregation/`fairPlayScore` are never asserted,
  and bugs common to both copies are invisible. **Fix:** test `computeGroupStandings`
  directly with hand-built `Result` maps; give `tiebreakers.ts` its own spec fed pre-built
  stats.

- **The UI layer is essentially untested.** Only `AppNav` and `ConfirmDialog` have specs.
  17/19 components and all 4 views have none — including logic-bearing
  `ScoreDialog`/`DisciplineInput` (card entry, penalty gating), `GroupTable`/`StandingsRow`,
  `PossibleTeamsDialog`, `BracketView`. Both stores and both composables have zero unit
  tests. All UI confidence rests on the (apparently unrun) e2e.

### Major

- **Group-stage score & card entry is untested at every level.** No e2e opens a group
  match to enter a score/cards (group e2e seeds via `localStorage`); only knockout drives
  the stepper. `DisciplineInput` is therefore exercised by **no test anywhere**, despite
  feeding fair-play (tiebreaker #7).
- **The "memoization" test asserts nothing about memoization.**
  `possible-teams.spec.ts:244-252` checks sorted-content equality (always true regardless of
  caching) instead of `expect(first).toBe(second)`. The module cache is also never cleared
  between tests (latent leakage).
- **`exportJson` untested; export path non-deterministic.** `persistence.spec.ts` covers
  only `parseImport`; `exportJson` (Blob + anchor + `new Date().toISOString()` filename) has
  no unit test. There is no `setupFiles` and no fake timers anywhere, so anything touching
  `Date` is wall-clock dependent.
- **Tiebreaker chain has shallow edge coverage.** Never isolated: criterion-3 (overall GF),
  H2H goal-difference / H2H goals-for as deciders, red-card weighting (`×3` — only
  `homeYellow` is ever set), and partial (some-unplayed) groups passed to `sortTeams`.
- **`third-place.spec.ts` only hits trivial paths.** All tests use uniform scores, so
  `compareThirdPlaced`'s fair-play and FIFA-rank branches and the `!allocation` null path
  are never reached; `'different slots'` uses a brittle order-sensitive `not.toEqual`.

### Minor

- Dead commented-out arithmetic scratchpads litter `standings.spec.ts` (e.g. 109-135,
  203-221); one `it` comment describes a different scenario than it asserts.
- Pervasive brittle CSS-class + positional selectors in e2e (`.bracket-round').nth(1)…`)
  couple tests to layout.
- Fixture-shape inconsistency: `groups.spec.ts:81` seeds the *export* shape
  `{version,results}` while every other e2e uses the persist shape `{results}` — works only
  because the persist plugin ignores the extra key.
- Tautological assertions (`size.toBeGreaterThan(0)`, `typeof id === 'string'`,
  `home!.id !== away!.id`) instead of exact membership.
- `knockout.ts:47` unknown-`matchId` branch untested; `ConfirmDialog.spec`/`AppNav.spec`
  use index-based button selection and don't test active-route `aria-current`.
- `RankingView` (newest feature) has no unit test; `smoke.spec` only checks its heading,
  not that 211 rows render or that WC participants are highlighted.
- `settings` store / dark theme tested nowhere.
- **No coverage gate** and a **stale `coverage/` report committed** that still references a
  deleted `src/lib/match-status.ts`.

#### Coverage-gap summary

| Module | Tested? | Notes |
|---|---|---|
| `lib/tiebreakers.ts` | Indirect only | No own spec; only via a spec that re-implements its inputs |
| `lib/standings.ts` (`computeGroupStandings`) | **No direct test** | played/form/cards/GA never asserted |
| `lib/third-place.ts` | Partial | fair-play / FIFA-rank / null-allocation paths untested |
| `lib/possible-teams.ts` | Decent | Memoization not actually tested; weak assertions |
| `lib/persistence.ts` | Partial | `parseImport` solid; `exportJson` untested |
| `lib/knockout.ts` | Good | Unknown-matchId branch untested |
| `lib/bracket-labels.ts` | Full | Well parameterized |
| `data/*` | Strong | `data.spec.ts` is the strongest file in the suite |
| `stores/tournament.ts` | e2e only | …which may not run |
| `stores/settings.ts` | None | Theme untested |
| `composables/*` | None | scroll-lock ref-counting & announce untested |
| 17 components + 4 views | Mostly none | Only AppNav/ConfirmDialog have specs |

---

## 6. Cross-cutting & Process

- **Documentation/code drift.** Several docstrings make promises the code breaks: the
  `possible-teams.ts` "every team in at least one scenario" header (§2), the `tokens.css`
  "never hardcode raw values" claim (§4), and the `standings.spec.ts` "tests
  computeGroupStandings" header (§5). Self-documenting code is undermined when comments
  assert invariants the implementation doesn't hold — prefer fewer comments that are true.
- **Dead code accumulating.** `OutcomeBadge.vue`, `PagePlaceholder.vue`, a committed stale
  `coverage/` report referencing a deleted module, and e2e tests for removed features all
  point to a missing "delete it when it dies" discipline.
- **CI gap (inferred).** The combination of red e2e tests shipping unnoticed and no
  coverage threshold strongly suggests the test suites aren't gating merges. Wiring
  `test:unit` + `test:e2e` + `typecheck` + `lint` into CI would have caught the majority of
  the §3/§5 Critical items automatically.
- **Recurring duplication theme.** The same anti-pattern repeats at every layer: the stepper
  (×6 components), card/dialog/button CSS (×8), cluster-by-criteria logic (×3),
  `isGroupComplete` (×2), theme tokens (×4). A pass to extract shared
  components/utilities/tokens would shrink the codebase meaningfully and remove whole classes
  of drift bugs.

---

_Review compiled from five focused passes (components, TS/logic, a11y, CSS, tests). Key
structural and breakage claims were verified directly against the source._
