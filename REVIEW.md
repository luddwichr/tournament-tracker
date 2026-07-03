# Technical Review — WM 2026 Tracker

Reviewed: full source (`src/`, `e2e/`, configs, hooks, CI, docs) as of `62638e1`.
Objective baseline: `lint` and `typecheck` clean; 550 unit tests in 56 files, all passing;
coverage 93.8 % statements / 89.8 % branches / 94.7 % lines.

**Verdict:** a well-above-average codebase — strict TypeScript, pure derived-state
architecture, real a11y investment, disciplined tests. The findings below are mostly
drift (comments/docs that no longer match reality), a handful of genuine a11y bugs,
one real performance landmine, and structural duplication that will tax the next
feature. Findings are ordered by relevance within each section.

Severity legend: 🔴 critical/high · 🟡 medium · 🟢 low/nit

---

## 1. Top priorities (cross-cutting)

1. 🔴 **Browser-freeze risk in `possible-teams` enumeration** — the GD-spread cap lift makes the worst case ~10⁹ evaluations (§4.1).
2. 🔴 **TeamDialog tabs are keyboard-unreachable** — roving tabindex without arrow-key handling; WCAG 2.1.1 failure axe can't catch (§6.1).
3. 🔴 **`REQUIREMENTS.md` is dangerously stale** — documents the wrong (2018/2022) tiebreaker order and a `penaltyWinner` field that doesn't exist; anyone "fixing" the code to match the doc would introduce a real bug (§4.2).
4. 🔴 **Dead dark theme** — the `prefers-color-scheme` palette in `tokens.css` can never apply because `data-theme` is always set explicitly with default `'light'`; OS-dark users get a blinding light app (§7.2).
5. 🔴 **`stores/tournament.ts` and `use-bracket-highlight.ts` have zero direct tests** — the central store and the entire highlight feature are unguarded (§8.1).

---

## 3. Vue best practices & conciseness

### 3.1 🟡 `useMatchResultForm` accepts plain values, freezing prop reactivity

`use-match-result-form.ts:17` takes `(match: MatchSlot, homeTeam: Team, awayTeam: Team)`
and is called with `props.match` etc. (`ScoreDialog.vue:35`). If a parent ever swaps
`:match` while `v-if` stays truthy, the form silently keeps writing results for the old
match. It works today only because every parent happens to unmount between matches — an
invariant enforced nowhere.
**Fix:** follow the composable convention — accept `MaybeRefOrGetter<...>` and
`toValue()` inside, or have parents pass `:key="dialogConfig.match.id"`.

### 3.2 🟡 `fetchLive` fetches the whole tournament feed for one match, with no cancellation

`use-match-result-form.ts:207-229` — the doc comment says "just this match", but
`syncResults()` fetches all provider results and maps all fixtures, then plucks one.
No `AbortSignal` is passed (the API supports it — `use-results-sync.ts` uses it), so
closing the dialog mid-fetch leaves a dangling request that later writes `fetchStatus`
on an unmounted component.
**Fix:** thread an `AbortController` aborted in `onUnmounted`; fix the comment or add a
provider-level single-match path.

### 3.3 🟡 Connector paths are computed from non-reactive DOM measurements

`use-bracket-highlight.ts:93-100` — the `connectorPaths` computed calls into
`querySelector` + `getBoundingClientRect`. A computed only re-evaluates on _reactive_
dependency changes; DOM geometry is invisible to Vue. With a match **pinned** (the touch
path, which persists), resizing, rotating, or late font/flag loading leaves the SVG
connectors pointing at stale coordinates.
**Fix:** a `ResizeObserver` on `roundsEl` bumping a `measureVersion` ref that the
computed reads (disconnect in `onScopeDispose`). This also makes the computed's impurity
explicitly keyed.

### 3.4 🟡 Watcher and pseudo-computed where derived state suffices

- `ScoreDialog.vue:37-40`: `showDrawError` ref + `watch(knockoutDraw, ...)` is the
  canonical avoidable watcher. Fix: `showDrawError = computed(() => attemptedDrawSave.value && knockoutDraw.value)`.
- `ScoreDialog.vue:42`: `isPastKickoff` is a fake computed over `Date.now()` — not
  reactive; it lies if the dialog is open across kickoff. Either compute it once as a
  plain `const` (honest one-shot) or use a ticking `useNow()` source.

### 3.5 🟢 Non-reactive prop capture in `GroupTable`

`GroupTable.vue:16` filters `groupMatches` against `props.groupId` at setup time while
`standings` two lines below is a proper computed. Works because `GroupsView` keys the
loop, but it's a landmine for reuse — and the inconsistency within one file is the tell.
**Fix:** make it a `computed`.

### 3.6 🟢 Emits named `click` shadow the native event

`MatchCard.vue:22` and `MatchScoreButton.vue` declare `click: []` as a component emit —
a well-known footgun (future `.stop`/`.prevent` modifiers won't behave natively; readers
can't tell custom from native at call sites). **Fix:** rename to intent: `edit` / `open-score`.

### 3.7 🟢 Questionable `v-for` keys

- `OriginColumn.vue` team rows: `:key="row.rank"` — on reorder, DOM nodes are reused
  across _different teams_, so per-node state (highlight ring, focus) sticks to the slot.
  Use `:key="row.team.id"`.
- `BracketView.vue:107`: `:key="round.title"` keys columns by a German display string;
  `round.stage` is the stable id next to it.

### 3.8 🟢 Convention drift, quick wins

- `ThemePicker.vue` hand-rolls `modelValue`/`update:modelValue` + radio `:checked`/`@change`
  while sibling inputs use `defineModel`; `defineModel<Theme>()` + `v-model` on the radios
  deletes the plumbing.
- Hardcoded element IDs (`confirm-dialog-desc`, `team-dialog-tab-*`, …) in ConfirmDialog,
  SyncDialog, TeamDialog while `BaseDialog` correctly uses `useId()` — use `useId()`
  consistently; dialogs can stack.
- `MatchScoreButton.vue`: `:disabled="disabled ? true : undefined"` is `:disabled="disabled"`.
- `StepperInput`/`ScoreInput` templates use `props.` prefixes; every other component uses
  bare prop names — pick one style.
- `AppHeader.vue:2,4`: two separate `import ... from 'vue'` lines.
- `AppHeader.vue:17-19`: Escape closes the nav but doesn't return focus to the burger
  button — focus is left on a hidden link.
- `GroupTable.vue:34`: `match!` non-null assertion; an early `if (!match) return null`
  (as KnockoutView does) removes it.
- `SettingsView.vue` import handler: `fileInput.value!.value = ''` inside async
  `FileReader.onload` — the ref can be null after unmount; and no `reader.onerror`, so a
  failed read fails silently.
- `StandingsRow.vue`/`ThirdPlaceRow.vue`: `statusLabel: Record<string, string>` throws
  away the status union — type it so a renamed status fails to compile instead of
  rendering `undefined`.
- `usePossibleTeamsDialog` returns `possibleTeamsMatch` doubling as the is-open flag and
  a `label` so generic every consumer renames it; prefer `{ isOpen, teams, label, open, close }`.
- `useMatchResultForm` returns 14 members incl. 6 sibling refs — the largest return
  surface in the codebase; nest as `goals: { home, away }` / `cards: {...}`.
- `knockout.ts:69-71`: `canEnterResult` is dead production code — only specs call it,
  while `BracketView` and `KnockoutView` re-implement the same check inline. Use it or
  delete it.

---

## 4. TypeScript & domain logic

### 4.1 🔴 The `possible-teams` enumeration is effectively unbounded in the worst case

`possible-teams.ts:36-39,98` — `maxGoalsPerSide` returns `Math.max(base, gdSpread + 1)`.
The "≤531k combos" claim in the header comment (line 8) only holds for the base caps.
After one 8:0 result, `gdSpread = 16` → with 4 matches remaining, (17·17)⁴ ≈ **7×10⁹**
leaf invocations of `computeGroupStandings` — a synchronous main-thread freeze measured
in hours. The early exit doesn't save you precisely in the interesting case (a team
mathematically excluded from the queried rank forces full enumeration). Users can enter
arbitrary scores; a typo like 30:0 makes `maxGoals = 31`.
**Fix:** clamp total work, not just per-side goals — e.g. reduce the cap while
`(cap²)^remaining > ~10⁶` — or enumerate outcome classes {W/D/L × capped GD} instead of
raw scorelines.

### 4.2 🔴 `REQUIREMENTS.md` contradicts the (correct) implementation

- §5.1 specifies the _old_ 2018/2022 tiebreaker order (overall GD before H2H, "restart
  the full chain") — the code and `docs/tournament-rules.md` correctly implement the
  2026 order (H2H before overall GD, no-restart d→g; verified against the regulations,
  including `resolveH2H`'s subset recursion). Anyone "fixing" the code to match
  REQUIREMENTS would introduce a real ranking bug.
- §§ referencing `Result.penaltyWinner: 'home'|'away'` and an "Elfmeterschießen" toggle
  describe a field that exists nowhere in the code.
- §1 lists "Live score auto-fetch" as out of scope, contradicting the shipped ESPN sync.
  **Fix:** correct §5.1 to mirror tournament-rules.md (or link instead of duplicating),
  update the result model description to the "enter the decisive score" convention, move
  live-sync into scope.

### 4.3 🟡 Storing shootout scores corrupts downstream goal aggregates

`espn.ts:120-128` + `results-sync/index.ts:64-72` — a 1:1 (4:2 pens) match is persisted
as `homeGoals: 4, awayGoals: 2`; `computeTeamStats` then shows goals that never happened,
and the match card displays a fabricated score (the `winner ? goals+1` branch invents
data with no real-world referent).
**Fix:** model it — an optional `decidedBy?: 'pens'` plus the real score and winner.
The ESPN hack is evidence the current model is too lossy; this is the same gap as the
removed `penaltyWinner`.

### 4.4 🟡 Persisted state is rehydrated with zero validation

`stores/tournament.ts:33-35` — file import goes through `parseImport`, but localStorage
rehydration doesn't; a corrupted/hand-edited entry flows straight into
`computeGroupStandings` (`'2' + 3` string-concat standings, no error surfaced).
**Fix:** an `afterHydrate` hook that validates and resets — the validator already exists
in `persistence.ts`, just trapped inside `isValidPersistedState`; export it.

### 4.5 🟡 `parseImport` loopholes

`persistence.ts:41-47` — accepts arrays (`typeof [] === 'object'`); never checks that
keys are real fixture ids or that `key === result.matchId`; unknown ids import silently
and sit invisible forever. Acknowledged as a loophole in REQUIREMENTS §9.8, but it's
three lines: reject arrays, validate entries against a `fixtureIds` set, require
`r.matchId === k`.

### 4.6 🟡 Type-level misses

- `data/teams.ts:19`: `teams: readonly Team[] = [...] as const` — the explicit
  annotation wins, so `as const` is inert and `Team.id` stays `string`. Use
  `as const satisfies readonly Team[]`, derive `type TeamId = (typeof teams)[number]['id']`,
  and type `squads: Record<TeamId, readonly Player[]>` — a missing/typo'd squad key
  becomes a compile error instead of a test failure.
- `fixtures-2026.ts:1349`: the 495-entry allocation table is force-cast; the over-wide
  `Partial<Record<GroupId, GroupId>>` forces dead `if (sourceGroup)` guards downstream
  (`third-place.ts:82,103`). Use `satisfies` with an exact host-group union.
- `types/tournament.ts:75-85`: `MatchSlot` isn't discriminated by stage, so "group
  matches always have concrete team refs" lives in comments and 4 runtime guards.
  A discriminated union deletes the guards and makes `match.group` non-optional where used.
- ~32 occurrences of `Record<string, Result>` restated across files, never `Readonly`.
  Add `export type ResultsMap = Readonly<Record<string, Result>>` and use it everywhere.
- `Team`/`MatchSlot`/`Player`/`Result` fields are mutable although every instance is
  shared static data or persisted state — one accidental `team.group = …` corrupts
  `teamsById` app-wide. Mark fields `readonly`.
- `tiebreakers.ts:122-160`: four `stats.get(...)!` assertions encode the "stats exist
  for every team" precondition invisibly; a partial map gives NaN comparisons → silently
  arbitrary order, not a crash. One guard at the top of `sortTeams` fixes it.
- The exhaustiveness `default` block is copy-pasted in `knockout.ts`, `possible-teams.ts`,
  `bracket-labels.ts` — extract a shared `assertNever`.

### 4.7 🟡 Duplicated Annex-C plumbing

`third-place.ts:72-85` vs `:91-106` — `buildGroupToThirdPlaceSlotMap` and
`resolveThirdPlaceSlot` duplicate the top-8 → key → allocation pipeline with different
iteration direction; two hand-rolled walks over the same table is where an inconsistency
bug would live. **Fix:** implement one in terms of the other (or extract
`qualifyingAllocation(ranked)`).

### 4.8 🟢 Smaller logic/API nits

- `espn.ts:99-101`: `detail.team?.id === homeTeamId` attributes a card to the home team
  when both ids are `undefined`. Guard with `homeTeamId != null && …`.
- `espn.ts:162-165`: blanket `catch { throw new Error(NETWORK_ERROR) }` erases the actual
  failure; use `{ cause: e }` and rethrow `AbortError` untouched.
- `espn.ts:52-53,187-196`: mutable module-level `nowImpl` + `_internal.setNow/reset` is a
  global test seam, inconsistent with the clean `fetchImpl` injection two lines away —
  add `now?: () => Date` to the options and delete the machinery.
- `onProgress` (`espn.ts:167-177`, `use-results-sync.ts:43-45`) fires from a fully
  synchronous loop after a single fetch — progress can only jump 0→100. Vestigial; drop
  it (YAGNI) or fetch per-day chunks for real.
- `stores/tournament.ts:20-28`: the `clearPossibleTeamsCache()` calls are redundant
  coupling — the cache is fingerprint-keyed and can never serve stale data; drop them or
  rename to `freePossibleTeamsMemory` so readers don't have to prove they're not load-bearing.
- `knockout.ts:41` / `possible-teams.ts:197`: `fixtures.find(...)` linear scans inside a
  recursive resolver — add `fixturesById` next to the existing `teamsById`.
- `standings.ts:36`, `teams.ts:78-80`: full-array rescans sit in the innermost loop of the
  possible-teams enumeration (~64M predicate calls at the honest worst case). Precompute
  `groupMatchesByGroup` / `teamsByGroup` maps.
- `squad.ts:3,16-17`: `NonNullable<Player['position']>` and the `!= null` fallbacks are
  dead — `position` isn't optional; drift from an earlier model (REQUIREMENTS §3 still
  says "optional"). Delete the dead defense.
- `bracket-labels.ts:16,20`: `ref.matchId.replace('M', '')` encodes the id format as a
  stringly assumption in a display helper; use `slice(1)` or a shared `matchNumber(id)`.
- `possible-teams.ts:134`: cache eviction dumps all 500 entries to admit one; a one-line
  FIFO delete keeps hot entries warm.

### 4.9 🟡 Data files

- **Six player names ship with Wikipedia disambiguation suffixes** — `'Matt Turner (soccer)'`,
  `'Chris Richards (soccer)'`, etc. (`squads.ts:62,140,345,347,356,369`), rendered
  verbatim in the squad list. Fix the generator (`scripts/fetch-squads.py`: strip
  trailing ` (…)`), regenerate, and add a spec asserting no name matches `/\(/`.
- 48 German team names are duplicated between `fifa-ranking.ts` and `teams.ts`, linked by
  `flagCode` only, with no drift guard — a rename shows two different names across views.
  Prefer `teamsById` names in the ranking view, or add a name-equality spec.
- Everything else validates clean (verified programmatically: fixture ids, group
  assignments, squad sizes/shirt numbers, all 495 allocation rows, bracket wiring
  against the rules doc).

---

## 5. HTML semantics

1. 🔴 **Nested `<main>` landmarks** — `RankingView.vue:29` and `SettingsView.vue:92` use
   `<main>` as their root inside App.vue's `<main id="main">`. Invalid HTML, duplicate
   landmark navigation — and the axe helper's tag set excludes the rule that would have
   caught it (§6.9). GroupsView/KnockoutView correctly use `<div>`; make it 4 of 4.
2. 🟡 **Abbreviated table headers rely on `title` only** — 19 occurrences across
   `GroupStandingsTable.vue:20-27`, `TeamStats.vue:15-20`, `ThirdPlaceTable.vue:51-55`
   (`<th title="Siege">S</th>`). `title` isn't announced by most screen readers and is
   invisible to touch users. Use `<abbr>` + `visually-hidden` full label — the pattern
   TeamStats already uses for its card-icon headers.
3. 🟡 **Static toggle rendered as a focusable no-op button** — `MatchCardMeta.vue:26-37`:
   with `hideLinkIcon`, the kickoff meta is still a `<button aria-pressed>` neutralized
   only with `pointer-events: none`, which does not remove it from tab order or the
   accessibility tree. Keyboard/SR users get a "highlight match connections" toggle on
   every group card that does nothing. Render a plain element in static mode; also
   `hideLinkIcon` names a visual side effect while actually switching interactivity —
   name it `interactive`/`static`.
4. 🟢 **Generic duplicated caption** — `GroupStandingsTable.vue:12-15`:
   `<section aria-label="Tabelle">` wrapping `<caption>Tabelle</caption>` announces
   "Tabelle … Tabelle" and never says which group. Caption it "Tabelle Gruppe A"; keep
   one of the two labels.
5. 🟢 **SquadList row headers styled as column headers** — `.squad-list th` paints player
   names in muted color; scope to `thead th`.

## 6. ARIA & accessibility

1. 🔴 **TeamDialog tabs keyboard-unreachable** — `TeamDialog.vue:47-65`: roving tabindex
   (`:tabindex="activeTab === tab.id ? 0 : -1"`) with no arrow-key handler; a keyboard
   user can never reach the "Spielplan" tab — half the dialog is inaccessible. WCAG 2.1.1
   failure that axe cannot detect. Fix: `@keydown.left/.right` moving focus + selection,
   or drop the roving tabindex (all tabs `tabindex="0"`) as the simpler compliant option.
2. 🔴 **Live announcements fired while a modal is open are inert** —
   `use-match-result-form.ts:69` announces through the global announcer in `App.vue`,
   but `showModal()` makes everything outside the dialog inert — SR users get no
   confirmation that "Ergebnis holen" filled the fields. Fix: a live region inside
   `BaseDialog`, or a visible `role="status"` success message inside ScoreDialog (the
   not-found/error slots already exist).
3. 🔴 **Card counts are invisible to screen readers** — `MatchCard.vue:69-92`: both card
   clusters are `aria-hidden` and the computed label only includes goals; an SR user
   cannot learn a match had cards at all. Append "2 gelbe Karten, 1 rote Karte" per side
   to the score-button label.
4. 🟡 **Freshly-inserted `role="status"` elements won't announce** — `SyncDialog.vue:49,54`,
   `ScoreDialog.vue:77`: the status `<p>` is created by `v-if` at the same moment its
   text appears; live regions must exist before content changes. Keep one persistent
   status container mounted and swap its text.
5. 🟡 **Focusable non-interactive rows** — `OriginColumn.vue:82-86`: 36 team rows get
   `tabindex="0"` + `cursor: pointer` but no role, no accessible purpose, no Enter/Space
   behavior. Make them real buttons with `aria-pressed` and a purpose label, or drop the
   tabindex and cursor.
6. 🟡 **Stepper gaps** — `StepperInput.vue:16-20`: the `−` button silently no-ops at 0
   (no disabled state, nothing to announce), and the value span has `aria-live` but no
   name — a naked number. `:disabled="model === 0"` + `role="group"` with a label (or
   the full spinbutton pattern).
7. 🟢 **Redundant ARIA** — `aria-modal="true"` on native `showModal()` dialog
   (`BaseDialog.vue`), `role="group"` inside `<fieldset>` (`ThemePicker.vue:16`),
   `role="status"` + `aria-live="polite"` together (`App.vue:50`). Delete all three.
8. 🟢 **`aria-label` erases the kickoff time** — `MatchCardMeta.vue:33`: the label
   replaces the accessible name, so the `<time>` content isn't announced. Include the
   formatted kickoff in the label.
9. 🟡 **axe integration gaps** — `e2e/support/a11y.ts:5`: the tag set excludes
   `best-practice` (exactly what would have caught nested-`main`); no scan covers
   `/ranking`, ScoreDialog (the app's core form), SyncDialog, or the dark theme.
   Add the tag, the missing scans, and one dark-theme run.
10. 🟢 **Touch targets** — `TeamLabel` and placeholder buttons are ~24 px tall, scraping
    WCAG 2.5.8 while the app's own `--tap-target` token is 44 px. Add min-height or
    document the exception.
11. 🟢 **Infinite header spin** — `AppHeader.vue:66-75`: reduced-motion is honored (good),
    but WCAG 2.2.2 asks for a pause affordance for _all_ users on >5 s auto-motion, and
    a permanently spinning sticky-header element is distracting. Spin ~2 cycles and stop.

## 7. CSS & Material Design alignment

1. 🔴 **Undefined design token** — `ScoreDialog.vue:123` references `var(--font-size-md)`;
   the scale is xs/sm/base/lg/xl/score. The declaration resolves to unset — team names
   silently render at the inherited size, and the token system loses its
   single-source-of-truth guarantee. Fix the reference; add a guard (grep/stylelint) that
   every `var(--…)` exists in tokens.css.
2. 🔴 **The dark `prefers-color-scheme` palette is dead code** — `tokens.css:80-101`
   defines it, but `App.vue:12-14` unconditionally sets `data-theme` from the settings
   store (default `'light'`), and `[data-theme='light']` always overrides the media
   query. OS-dark users get a light app; ThemePicker offers no "System" option. Fix:
   default theme `'system'`, set `data-theme` only for explicit choices.
3. 🟡 **`btn--danger` neutralized by scoped specificity** — `SettingsView.vue:108` pairs
   `settings-view__btn` (scoped, higher specificity) with global `.btn--danger`, so the
   destructive "Zurücksetzen" renders like a neutral button; `.settings-view__btn` is
   also a wholesale duplicate of `.btn` from base.css. Use `btn btn--danger` and delete
   the duplicate.
4. 🟡 **State layers half-adopted; primary hover is an opacity hack** — `base.css:80-82`
   fades the whole button including its label (reducing text contrast — the opposite of a
   Material state layer), and `.btn` has no `:active` state, while the
   `--state-hover/focus/pressed` tokens are used correctly in StepperInput and AppHeader.
   Use `color-mix()` state tints uniformly on all `.btn` variants.
5. 🟡 **1.45:1 component boundaries in light theme** — `--color-border: #cbd5e1` on white
   is the sole boundary of `.btn--secondary`, the ThemePicker segmented control, and the
   steppers; WCAG 1.4.11 wants 3:1 for UI component boundaries. Add a
   `--color-border-strong` (~`#94a3b8`) for interactive outlines.
6. 🟡 **Elevation system has two vocabularies** — one `--elevation-1` alias used once,
   while AppHeader and BaseDialog reach for raw `--shadow-sm`/`--shadow-lg`. Define
   `--elevation-1/2/3`, use only those in components, and pair dark-theme elevation with
   surface tint (shadows barely read on `#0f172a`).
7. 🟡 **Duplicated recipes base.css exists to prevent** — GroupTable and ThirdPlaceTable
   re-implement `.sticky-card-header` minus stickiness; StandingsRow vs ThirdPlaceRow
   share ~40 near-identical lines (edge strip, rank/num/pts cells, identical `:deep()`
   clamp); the reduced-motion kill-switch is declared in both reset.css and base.css.
   Extract a shared standings stylesheet/component; delete the duplicate block.
8. 🟢 **Motion tokens bypassed** — hard-coded `0.15s` without the easing token in
   `MatchScoreButton.vue:63-65` and `MatchCardMeta.vue:52` while other components use the
   tokens correctly.
9. 🟢 **Breakpoint token is unusable dead weight** — `--breakpoint-sm: 640px` (custom
   properties can't appear in media queries) while `640px` is hard-coded in 3 files and
   GroupsView uses `49rem`. Delete the token; standardize breakpoint units.
10. 🟢 **Magic icon sizes** — CardIcon is sized with three ad-hoc aspect ratios across
    MatchCard/DisciplineInput/TeamStats (a 12:16 viewBox), and its in-icon count text
    renders at ~7 px in MatchCard — illegible. Give the icon a ratio-honoring default
    and scale via `em`; move counts outside the glyph.

## 8. Stylistic consistency

1. 🟡 **Physical vs logical properties mixed** — 21 physical occurrences
   (`border-left`, `padding-left`, `margin-left/right`, `text-align: left`) against 5
   files already using logical properties; the same visual concept (left accent strip)
   is `border-left` in StandingsRow and `border-inline-start` in RankingView. Standardize
   on logical (the codebase clearly aims there).
2. 🟡 **Per-view gutter/heading anarchy** — `.app-main` pads the page, but RankingView
   and SettingsView add their own padding on top (doubled gutters vs Groups/Knockout);
   GroupsView/KnockoutView carry byte-identical `__heading` CSS while Ranking/Settings
   style bare `h1`/`h2` element selectors against the otherwise-impeccable BEM
   convention. One `.view-heading` utility; `.app-main` owns the gutter.
3. 🟢 **Five unrelated dialog width pairs** — `min(90vw,28rem)`, `min(95vw,28rem)`,
   `min(90vw,26rem)`, `min(90vw,24rem)`, `min(92vw,32rem)` across the dialogs; two
   tokens cover all six call sites.
4. 🟢 **BEM block boundary violation** — `BracketMatchItem.vue:61` defines
   `.bracket-round__section-label`, an element of the BracketRound block, in the wrong
   component.
5. 🟢 **Focus-ring rule duplicated** — the global `:focus-visible` (base.css:16-20) is
   re-declared verbatim in AppHeader and InfoDisclosure; delete the copies.
6. 🟢 44 declarations of font-weight 600/700 — a `--font-weight-semibold/bold` token pair
   would finish the otherwise token-complete typography story.

---

## 9. Test suite

### Coverage gaps (by impact)

1. 🔴 **`stores/tournament.ts` has no spec.** Every mutation path and the
   `clearPossibleTeamsCache()` contract are untested; the persist key is also duplicated
   as a magic string in `e2e/support/results.ts:5` — a schema-version bump breaks every
   seeded e2e test with confusing symptoms. Add a small store spec and export the storage
   key from src (e2e already imports `groupMatches` from src).
2. 🔴 **`use-bracket-highlight.ts` (108 lines) is completely untested** — hover-beats-pin
   precedence, ref-key vs match-id connector selection, pin toggling; neither unit nor
   e2e exercises the highlight feature at all. (Coverage run confirms: 38 % stmts, and
   that only via incidental imports.)
3. 🟡 **The most delicate numeric logic in `possible-teams.ts` is untested** — the
   `maxGoalsPerSide`/`gdSpread` lift (§4.1) has no test where a team trails by 5 goals
   and only qualifies because of the spread lift; an off-by-one silently excludes teams.
4. 🟡 **The "memoization" tests don't test memoization** — `possible-teams.spec.ts:239-261`:
   both pass on a no-op cache (Team identity comes from `teamsById`, not the cache).
   Test the property the cache-key comment worries about — same scores, different card
   counts must not return a stale collided set — or delete them.
5. 🟡 **Validator error paths half-tested** — `persistence.spec.ts`: the entire
   `isNonNegativeInteger` half (negative/fractional/NaN goals, non-string matchId) is
   unexercised — exactly the corrupt-import cases the validator exists for. 2–3
   `it.each` rows.
6. 🟢 `provideTeamViewer` and `use-possible-teams-dialog`'s label fallback are untested;
   the label fallback is genuine logic worth 2 direct tests.

### Test design

1. 🔴 **Vacuous conditional assertion** — `DisciplineInput.spec.ts:70-80`: the "does not
   go below 0" test wraps its only assertion in `if (emitted) {…}` — it passes whether
   the event fires, doesn't fire, or the clamp is broken. Assert
   `expect(wrapper.emitted(...)).toBeUndefined()` — as `StepperInput.spec.ts:29-36`
   already does correctly.
2. 🟡 **Latent infinite recursion in a mock** — `persistence.spec.ts:65-68`: the
   `createElement` mock's fallback calls `document.createElement` — the mock itself; any
   future non-`'a'` element hangs the run. Capture the original before spying. The block
   also over-mocks (only `click` and the object-URL pair need stubbing), making the
   append/remove assertions implementation echoes.
3. 🟡 **Module-scope shared router leaks state across tests** — `AppNav.spec.ts:7-16`,
   `AppHeader.spec.ts:7-14`: one router instance shared by all tests; `router.push` in
   one test mutates state for any test added after it. Build the router in `beforeEach`.
4. 🟡 **CSS-class selectors as the default query strategy** — the suite consistently
   queries `.btn--danger`, `.base-dialog__title`, etc. while the same tests prove
   excellent aria-labels exist. A design-token rename breaks 20+ tests; worse, a test can
   pass against the wrong button. Prefer role/label queries (ScoreInput and
   DisciplineInput specs already do this well — apply uniformly). The suite's most
   systemic smell.
5. 🟢 `vi.stubGlobal('FileReader', …)` never unstubbed (`SettingsView.spec.ts:36-47`);
   compare `use-scroll-lock.spec.ts` which does it correctly.
6. 🟢 Child-`$emit` driving in BracketView/KnockoutView specs means no test outside e2e
   exercises the real DOM click → dialog path in the bracket — acceptable, but be aware
   e2e is the only guard there.

### Brevity & DRY

1. 🟡 **The `showModal/close` stub block is copy-pasted verbatim in 11 spec files**
   (~55 duplicated lines), and `setActivePinia(createPinia())` in 11 files — there is no
   vitest `setupFiles`. Add `src/test-support/setup.ts` with the dialog polyfill and
   shared helpers.
2. 🟡 **Three competing `allGroupResults`/`makeResult` implementations** —
   `src/test-support/results.ts`, `third-place.spec.ts:27-39` (same name, more capable),
   `e2e/support/results.ts`. Promote the capable one into test-support; e2e can import it.
3. 🟢 Identical 19-line `makeStat` factory in three specs — belongs in test-support next
   to `makeTeam`.
4. 🟢 Redundant tests: three ScoreInput tests assert the same four aria-labels; two
   BracketRound tests are the same assertion at n=2/n=3; four DisciplineInput emit tests
   are `it.each` material; four possible-teams tests re-derive one scenario.
5. 🟢 Tests of the framework: `settings.spec.ts:21-33` verifies Pinia/`ref` semantics on
   a one-ref store while the store's only real behavior (`persist: true`) is untested;
   `BracketConnectors.spec.ts:6-9` asserts "renders an svg element".

### E2E

1. 🟡 **The primary user journey has no e2e test** — entering a group-stage score through
   the UI (tap card → stepper → save → standings re-rank) is never exercised;
   persistence is verified only via localStorage seeding, and only the knockout dialog
   is driven through the UI. The flagship flow deserves one real journey test.
2. 🟡 **Positional/CSS-coupled selectors** — `score-dialog.ts:28-30` clicks the "first
   `.stepper__step` containing `+`" (silently increments the wrong stepper if DOM order
   changes; the app already exposes `aria-label="Tor für <Team> hinzufügen"`);
   `knockout.spec.ts:117-122` relies on a documented fixture-data accident for card
   order (`data-match-id` exists in the DOM — use it); rounds addressed by `.nth(index)`
   instead of their aria-label.
3. 🟡 **Seeding bypasses the persistence plugin's contract** — `e2e/support/results.ts:11-17`
   writes raw serialized state; a plugin upgrade that adds metadata breaks every seeded
   test with "why is the bracket empty" symptoms. At minimum, a comment + an explicit
   canary test.
4. 🟢 Double navigation per test (`goto('/')` just to clear storage, then the real goto)
   × ~25 tests — `context.addInitScript` removes the first load. One assertion-free test
   (`possible-teams.spec.ts:36-39`) is fully subsumed by its neighbor — delete. The
   48-team visibility loop in `groups.spec.ts:19-23` uses `.first()` (dodging strict
   mode, weakening the check) and is the slowest test — scope to the group instead.
5. 🟢 `pwa-offline.spec.ts` phase 2 rewrites `dist/index.html` on disk while preview
   serves it — safe today only via `fullyParallel: false`; pin `workers: 1` in the PWA
   config to make the safety explicit.

### Test config

1. 🟡 **Coverage thresholds far below reality** — thresholds 70/70/60/70 vs actual
   ~94/90/95/95, and CI runs `test:unit` (not `:coverage`), so the thresholds are dead
   config twice over. Ratchet to observed − ~3 pts and run coverage in CI.
2. 🟡 **`globals: true` is set but unusable and unused** — no tsconfig has
   `vitest/globals`, and all 56 specs import explicitly (the better convention). Remove it.
3. 🟢 Everything runs in jsdom, including ~1,900 lines of pure-logic specs (with the
   531k-combination enumeration). `environment: 'node'` default + per-file jsdom
   annotations is a noticeable startup win (the coverage run shows 90 s of environment
   setup vs 27 s of tests).
4. 🟢 Chromium-only; for a mobile-first PWA one `devices['Pixel 7']` project is cheap and
   would catch burger-nav/scroll behaviors unit tests can only fake. Add
   `screenshot: 'only-on-failure'` for CI triage.

---

## 10. Tooling & project setup

### TypeScript setup

Top-decile strictness (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noPropertyAccessFromIndexSignature`, `noImplicitOverride`, `erasableSyntaxOnly`) with a
clean base/app/node/vitest project-reference layout.

### Linting & formatting

The eslint↔oxlint bridge (`buildFromOxlintConfigFile` placed last) is the canonical
pattern, and nearly every rule override carries a why-comment.

### Build / PWA

The workbox config comments (navigateFallback rationale, GH-Pages 404 fallback) are
exceptional.

---

## 11. Genuinely positive aspects

- **Derived-everything architecture.** One mutable `results` map; standings, third-place
  ranking, and the whole bracket are pure functions of it. This is why the app can be
  this small, this testable, and this fast to reason about.
- **The 2026 tiebreaker chain is actually correct** — H2H-first with subset recursion and
  no-restart d→g. Most implementations get this wrong; here it's also documented against
  the regulations with deliberate deviations called out honestly. Annex C is encoded
  verbatim (all 495 combinations) rather than "recomputed by intuition", and validates clean.
- **Top-decile TypeScript strictness** (`noUncheckedIndexedAccess` +
  `exactOptionalPropertyTypes` + `noPropertyAccessFromIndexSignature` on a real app),
  `GroupId` derived from runtime data, branded `ThirdPlaceKey`, exhaustive `never`
  switches, honest all-optional boundary types for the ESPN feed.
- **Uniformly modern Vue authoring**: every SFC is `<script setup lang="ts">` with
  type-based props/emits, `defineModel` on the inputs, Vue 3.5 APIs (`useTemplateRef`,
  `useId`). `BaseDialog` is a strong native-`<dialog>` wrapper (single close path,
  refcounted scroll lock, focus restore for free). `useResultsSync` is a genuinely
  race-safe state machine (per-run AbortController, guarded post-await writes).
- **A11y investment far above hobby-project baseline**: skip link, route-change focus
  management + announcements, status never conveyed by color alone (with the rule
  documented in tokens.css), descriptive control labels in context ("Tor für Spanien
  abziehen"), centralized axe helper scanning seeded states and open dialogs.
- **Comments explain _why_, almost never _what_** — the GroupsView 49rem grid derivation,
  the possible-teams cache-key rationale, the workbox/GH-Pages fallback documentation are
  model comments.
- **Test suite discipline**: domain tests against real fixtures with hand-derived math
  shown; data-integrity specs as a gate (the table↔bracket drift check is genuinely
  clever); injectable fetch/clock in the ESPN provider; cancellation-race coverage; zero
  snapshots; no `wrapper.vm` state-poking; e2e page objects with a PWA deploy-marker
  staleness test most suites never attempt.
- **Infrastructure**: canonical eslint↔oxlint bridge; digest-pinned devcontainer base
  image with version-sync comments; 100 % exact-pinned dependencies per the house rule;
  a real CI pipeline; typecheck in the build path.

---

## 12. How to improve: established techniques & feedback loops (especially for coding agents)

The recurring failure mode in this codebase is not bad code — it's **drift**: comments,
docs, and configs that describe a state the code has left (`main.ts` bundle comment,
REQUIREMENTS.md tiebreakers, dead dark theme, dead coverage thresholds, disabled
pre-push hook, squad-name suffixes). Drift is exactly what mechanical feedback loops
catch and humans/agents don't. Concrete program, in order of leverage:

1. **One `npm run check` as the single contract** — `typecheck && format:check && lint
&& test:unit:coverage`, called by CI, by pre-push, and by any coding agent before it
   declares work done. A single command that must pass is the highest-value feedback
   loop for agent workflows: it removes "which checks exist?" as a failure point, and
   CLAUDE.md should say exactly that ("run `npm run check` before committing; a task is
   not complete while it fails").
2. **Make every threshold a ratchet, not a floor.** Coverage thresholds at 70 % while
   reality is 94 % means the loop is disconnected — an agent can delete a module's tests
   and stay green. Set thresholds to observed − 2-3 pts (or `thresholds.autoUpdate`
   locally, committed), and _run coverage in CI_. Same principle now applied to bundle
   size (a `size-limit` budget on `dist/assets/index-*` runs in CI on every push/PR) —
   generalize it to the PWA precache payload as a whole, since for an offline-first app
   that _is_ the product.
3. **Turn conventions into lint rules; delete them from prose.** Every rule that lives
   only in CLAUDE.md or a reviewer's head will be violated by the next agent session.
   Candidates from this review: `vuejs-accessibility` plugin (§6 findings), stylelint
   with `plugin/use-logical` + a custom-property-must-exist check (§7.1, §8.1),
   `oxlint --deny-warnings`, import ordering. The house `toSorted()` rule shows the team
   already knows this works — extend the pattern.
4. **Encode invariants as types or data-integrity tests, never as comments.**
   `TeamId`-keyed squads (§4.6) turns a data bug into a compile error; the existing
   `data.spec.ts` pattern should grow the missing guards (no `(` in player names,
   ranking↔teams name equality, storage-key single-sourcing). Where a comment currently
   states an invariant ("callers must not mutate"), promote it to `readonly`.
5. **Keep executable docs, kill aspirational ones.** REQUIREMENTS.md's tiebreaker section
   actively endangers the code it describes (§4.2). Rule of thumb: a doc may describe
   _intent_ (tournament-rules.md does this well, with tests referencing it) but must not
   _duplicate_ what code/tests already state — link instead. Add a README that documents
   the feedback loops themselves (scripts, hooks, CI, deploy base path), because that's
   the doc agents read first.
6. **Rebalance the hook pyramid** — fast, deterministic checks close to the keystroke
   (format+oxlint pre-commit, `check` pre-push), slow ones in CI (e2e, PWA suite,
   coverage, axe). A disabled-because-too-slow hook (§10) protects nothing; a 5-second
   hook that always runs protects everything. And fix the pre-commit staging footgun —
   agents doing scoped commits will silently sweep unrelated changes with it.
7. **Give agents a runnable ground truth for the UI.** The gaps axe can't see (keyboard
   tab traps, inert live regions) were the worst a11y findings. Add the missing
   axe scans (ScoreDialog, dark theme, /ranking), one keyboard-only e2e journey, and
   one mobile-viewport Playwright project. For agent sessions, `npm run dev` +
   playwright-cli screenshots is the strongest "did it actually work" loop — cheaper
   than reasoning about CSS in the abstract.
8. **Close the loop on generated data.** `squads.ts` shipped `(soccer)` suffixes because
   the generator's output is trusted blind. Every generator script should have a
   validation step in the same run (the `data.spec.ts` suite is the natural home) so
   regeneration can't ship garbage.
