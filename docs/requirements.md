# Requirements: World Cup 2026 Tracker

Offline-first PWA to track the **FIFA World Cup 2026**.
It shows the full schedule, takes real match results, and computes group standings and the entire knockout bracket
automatically.
This is reconstructed from the project's plan, its docs and the current implementation.
Where the shipped code and the planning docs disagree, the **code is authoritative**.

---

## 1. Product scope

- **Result tracker only.** No predictions or tipping, and no scoring of guesses.
- Single-user and single-device.
  State lives in `localStorage`, and the only sharing mechanism is manual JSON export and import.
- The tournament is already underway at ship time, so the app must support back-filling already-played matches from
  day one.
- **Live score fetch**, opt-in, at two granularities.
  Both pull finished results from ESPN's public scoreboard API in `src/lib/results-sync/`.
  Per match, `ScoreDialog` offers an "Ergebnis holen" button that fills the score and card fields for review, and
  nothing is written to the store until the user saves.
  Tournament-wide, the settings view offers "Ergebnisse abrufen", which fetches every finished match and imports them
  after a confirmation step in `SyncDialog`.
- **UI language is German** for all user-facing strings.
  **Code language is English** for files, identifiers and comments.

### Out of scope (explicit)

- Predictions and tipping, meaning scoring of guesses
- Multi-user or cross-device sync
- Cloud backup
- Venue, stadium and referee data
- UI languages other than German
- Manual override of deduced knockout matchups
- Penalty shootout kick-by-kick data.
  Only the per-side penalty-goal totals are recorded, as `homeShootoutGoals` and `awayShootoutGoals` on `Result`.
  That is enough to mark the match "i.E." and derive the winner.
- Disciplinary suspensions
- Squad changes

---

## 2. Tech stack & conventions

- **Vue 3** with the `<script setup>` Composition API, plus **Vite** and **TypeScript**.
  TypeScript 6 and 7 run side by side, see [`docs/typescript-7-side-by-side.md`](./typescript-7-side-by-side.md).
- **Pinia** and `pinia-plugin-persistedstate` for state.
  **Vue Router** in history mode, respecting `BASE_URL`.
- **`vite-plugin-pwa`** with `registerType: 'prompt'` and Workbox `generateSW`.
- **`flag-icons`** by lipis for flags.
  It must support the GB constituent nations `gb-eng`, `gb-sct` and `gb-wls`.
- No UI framework.
  Plain CSS with custom-property **design tokens** in `src/styles/tokens.css`, the Andy Bell modern reset in
  `reset.css`, and shared base styles in `base.css`.
- **Vitest** and `@vue/test-utils` for unit tests, co-located as `*.spec.ts`.
  **Playwright** with `@axe-core/playwright` for e2e in `/e2e`, plus a separate Playwright config for the offline PWA
  test.
- **oxlint** and **eslint** for linting, and **oxfmt** for formatting.
  `npm run lint` runs both linters.
  eslint additionally enforces the import boundaries configured in `eslint.config.js`.
- **All npm dependencies pinned to exact versions**, so no `^` or `~`, enforced by convention and CI.
  `docs/` keeps one note file per significant dependency.
- **Non-mutating array methods only**, meaning `toSorted`, `toReversed` and `toSpliced`.
  `oxlint unicorn/no-array-sort` enforces this.
- Per-dependency upgrade notes are maintained under `docs/` before behavior-changing upgrades land.

---

## 3. Domain model (`src/types/tournament.ts`)

- `GroupId` is `'A'..'L'` for the 12 groups, derived from a `GROUP_IDS` const array.
- `Stage` is `'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'`.
- `Team` has a readonly `id` (lower-case FIFA code), a German `name`, a `flagCode`, a `group`, and `fifaRanking`,
  which is the World Ranking position where lower is better.
- `Player` has a readonly `number`, `name` and `position` (`GK|DF|MF|FW`, always present).
- `TeamRef` is a possibly-unresolved team pointer:
  `team` | `groupRank{group,rank:1|2}` | `thirdPlace{slot:1..8}` | `matchWinner{matchId}` | `matchLoser{matchId}`.
  The loser kind is only used for the third-place play-off.
- `MatchSlot` is a discriminated union on `stage`.
  `GroupMatchSlot` has `stage: 'group'`, a non-optional `group`, and `homeRef` and `awayRef` narrowed to
  `ResolvedTeamRef`, because group matches always reference concrete teams.
  `KnockoutMatchSlot` covers any other stage, has no `group`, and takes the full `TeamRef` for both sides.
  Both carry an `id` of `'M01'..'M104'` and an ISO-8601 `kickoff` with the venue UTC offset.
- `Result` has `matchId`, `homeGoals`, `awayGoals`, `homeYellow`, `homeRed`, `awayYellow` and `awayRed`, where red
  includes second-yellow send-offs, plus optional `homeShootoutGoals` and `awayShootoutGoals`.
  `homeGoals` and `awayGoals` are the real goals after regulation and extra time.
  The shootout fields are present only for a shootout-decided knockout match, with both set together, a level regular
  score and a decisive shootout, all enforced at the persistence boundary.
  The UI shows the _folded_ score, with shootout goals added and marked "i.E.", via `foldedScore` in `knockout.ts`.
  Winner resolution uses the folded score, while team stats use the real goals, so shootout matches count as draws per
  FIFA convention.
- `ResultsMap` is `Readonly<Record<string, Result>>`, used at every read-only call site instead of restating the
  `Record` shape.
- `PersistedState` is `{ version, results: ResultsMap }`.
- `ThirdPlaceKey` is a branded sorted-group-letters string built via `toThirdPlaceKey(groups)`, used to index the
  Annex C allocation table.

Only the **results map** is mutable and persisted.
Everything else, meaning standings, third-place ranking and knockout matchups, is **derived** by pure functions.

---

## 4. Static data

- **`teams.ts`** holds the 48 qualified teams, using final-draw groups with play-off slots resolved to the actual
  March 2026 winners.
  It carries German names, `flag-icons` codes, and the FIFA ranking from the **11 June 2026** snapshot.
- **`fixtures-2026.ts`** holds all **104** `MatchSlot`s:
  - 72 group matches (`M01`–`M72`) with real kickoffs, where each team plays exactly 3.
  - 32 knockout matches (`M73`–`M104`): 16 R32, 8 R16, 4 QF, 2 SF, 1 third-place play-off and 1 final, chained via the
    `TeamRef` kinds.
  - **`THIRD_PLACE_ALLOCATION`**, the verbatim FIFA "Annex C" table with all 495 combinations of `C(12,8)`, keyed by
    sorted qualifying-group letters.
    `THIRD_PLACE_SLOT_HOST` maps the 8 third-place slots to host groups.
    This table is **the** source of truth and must never be recomputed by intuition.
- **`squads.ts`** holds 48 × 26 players with shirt number, Latin-script name and position.
  It is read-only and generated by `scripts/fetch-squads.ts` from Wikipedia.
- **`fifa-ranking.ts`** holds the full FIFA ranking, meaning all 211 associations with points from the 11 June 2026
  release.
  It is generated by `scripts/fetch-fifa-ranking.ts`.
  The 48 WC teams sit at exactly the positions stored as `Team.fifaRanking`, which is test-guarded.

Sanity unit tests cover 104 unique ids, 3 group matches per team, every knockout slot being reachable, and every team
having a squad and a FIFA ranking.

---

## 5. Business logic (`src/lib/`, pure & unit-tested)

### 5.1 Group standings & tiebreakers (`standings.ts`, `tiebreakers.ts`)

Teams are first separated by **points**, at 3, 1 and 0.
Equal-points teams go through the FIFA Article 13 chain.
See [`docs/tournament-rules.md`](../docs/tournament-rules.md) for the full, regulation-sourced description.
In short, for the **2026** tournament:

- **Step 1, head-to-head** among all tied teams, counting matches between them only:
  points → goal difference → goals scored.
- **Step 2, for teams still tied after Step 1:** re-apply the same three head-to-head criteria to the matches among
  only the still-tied subset.
  If that still doesn't decide it, apply overall goal difference → overall goals scored → fair-play score →
  FIFA World Ranking, **without restarting** the chain.
  That is a "no-restart" sequence rather than a fresh Step 1.
- **Fair-play score** is simplified to `score = −1·yellow − 3·red` summed across group matches.
  Higher, meaning less negative, is better.
- **FIFA World Ranking** is the deterministic final tiebreaker, with a lower position being better.
  It **replaces FIFA's drawing-of-lots** step and always resolves, since ranking positions are unique, so there is no
  unresolved-tie UI state.

Note the 2026 reordering versus 2018 and 2022:
**head-to-head (Step 1) is applied _before_ overall goal difference** (Step 2), not after.

### 5.2 Third place (`third-place.ts`)

All 12 third-placed teams are ranked by the cross-group chain of points → GD → GF → fair-play → FIFA ranking.
There is no head-to-head step, since the teams come from different groups.
`rankThirdPlaced` returns `null` until all 12 groups complete.
`rankThirdPlacedLive` always returns the current ranking plus a `final` flag, true once all 12 groups are complete.
The groups view uses that to show a live "who currently qualifies" table before the group stage ends.
`resolveThirdPlaceSlot` takes the top 8, builds the sorted key, looks up `THIRD_PLACE_ALLOCATION`, and maps host group
→ source group → team.

### 5.3 Knockout resolution (`knockout.ts`)

`resolveTeamRef(ref, results) → Team | null` walks the full `TeamRef` chain, returning `null` at any unresolved step.
A level knockout score is unresolved, since the winner is unknown until a decisive score is entered.
`MatchCard` disables result entry via `blocked`, derived from `resolveTeamRef` returning `null` for either side, while
either side is unresolved.

### 5.4 Possible teams (headline feature, `possible-teams.ts`)

`possibleTeamsFor(ref, results) → Set<Team>` enumerates every team that could still fill an unresolved slot:

- **`groupRank`** enumerates plausible scores for the remaining group matches.
  It uses an adaptive per-side range, lifted to cover the current goal-difference spread and clamped to a fixed
  total-combinations budget, see § "Ambiguities" #3.
  It collects every team reaching the target rank in at least one scenario, and early-exits when all group teams are
  found.
  Results are **memoized** per `(group, rank, result-fingerprint)`.
- **`thirdPlace`** is exact via `resolveThirdPlaceSlot` once all groups complete.
  Otherwise it approximates by scanning Annex C for possible source groups and collecting their rank-3 candidates.
- **`matchWinner` and `matchLoser`** are exact if played.
  Otherwise they return the union of upstream home and away possibilities, recursing as needed.
- **`team`** is a singleton, or empty for an unknown id.

Memoization memory is proactively freed on any result change, reset or import via `freePossibleTeamsMemory`.
That is memory hygiene only, not a correctness requirement, since cache entries are keyed by a full result fingerprint
and can never serve stale data.

### 5.5 Persistence (`persistence.ts`)

- `SCHEMA_VERSION = 2`, with the versioned localStorage key `wc2026:results:v2`.
  v2 added the optional shootout fields and returned `homeGoals` and `awayGoals` to real goals.
  v1 data, in both localStorage and export files, is still read, because the field shapes are compatible.
  Pre-v2 folded shootout scores are absorbed as-is, since they are indistinguishable after the fact.
  The v1 localStorage entry is adopted once via `readLegacyResults`, re-persisted under the v2 key, then removed.
- Schema-change tripwire: `PERSISTED_RESULT_FIELDS` in `persistence.ts` is pinned to the `Result` type via
  `satisfies`.
  Any structural change to `Result` fails compilation until `SCHEMA_VERSION` is bumped and a migration for the
  outgoing version is written.
  See the comment there.
  A semantics-only change needs the same treatment by convention.
- `exportJson(results)` downloads `wc2026-results-YYYY-MM-DD.json` shaped as `{ version, results }`.
- `parseImport(text)` parses and **validates**.
  It checks for a readable version of 1 or 2, rejects arrays, validates per-result fields so all counts are
  non-negative integers and shootout fields obey the `Result` invariants, requires every key to be a real fixture id,
  and requires `result.matchId` to equal its own key.
  It throws a German error on any violation.
- localStorage rehydration on app load goes through the same validator, `isValidResultsMap` exported from
  `persistence.ts`, via an `afterHydrate` hook on the `tournament` store's persistence plugin.
  A corrupted or hand-edited entry resets to an empty state instead of propagating garbage into
  `computeGroupStandings` and friends.

---

## 6. State (Pinia)

- The **`tournament`** store holds `results: ResultsMap` and the actions `enterResult`, `clearResult`, `reset` and
  `importResults`.
  It is persisted under the versioned key.
- The **`settings`** store holds `theme: 'light' | 'dark' | 'system'`, defaulting to `'system'`, and is persisted.
  `App.vue` applies it via `document.documentElement.dataset.theme`.
  For `'system'` it removes the attribute instead, so the unscoped `@media (prefers-color-scheme: dark)` block in
  `tokens.css` follows the OS preference.

---

## 7. UI / routes

Navigation is a header bar that collapses behind a burger toggle below 640px and expands to a persistent inline row at
or above it, in `AppNav.vue` and `AppHeader.vue`.
Each entry pairs an icon with its German label.
Both live in `AppNav`'s own `links` list rather than in router meta, which carries only `title`.
The browser tab title is synced to the route.
There are four routes:

| Route       | Title (DE)    | Content                                          |
| ----------- | ------------- | ------------------------------------------------ |
| `/groups`   | Gruppen       | 12 group cards (standings table + 6 match cards) |
| `/knockout` | K.-o.-Runde   | Knockout bracket + group-origin column           |
| `/ranking`  | Weltrangliste | Full FIFA ranking, WC participants highlighted   |
| `/settings` | Einstellungen | Theme picker + export / import / reset           |

`/` redirects to `/groups`.

### 7.1 Groups view

12 `GroupTable`s sit in a responsive CSS Grid that goes 1→2→3→4 columns by width.
Each table has standings rows computed reactively, showing rank, `TeamLabel`, P/W/D/L/GF/GA/GD/Pts and recent-form
`OutcomeBadge`s, plus the 6 group matches as `MatchCard`s.

Below the grid, `ThirdPlaceTable` ("Die besten 8 Drittplatzierten") shows all 12 current third-placed teams ranked by
`rankThirdPlacedLive` from `third-place.ts`, live even before the group stage finishes.
Each `ThirdPlaceRow` shows only the columns relevant to the cross-group tiebreaker chain, in breaking order: group
letter, points, goal difference, goals scored, fair-play score and FIFA ranking.
The top 8 are marked "sicher" or "qualifiziert" in green and the rest "gefährdet" or "ausgeschieden" in red.
"sicher" and "gefährdet" apply while the group stage is still running, and "qualifiziert" and "ausgeschieden" once all
12 groups are complete, mirroring the in-group status treatment in `StandingsRow`.
An `InfoDisclosure` placed above the table explains the tiebreaker chain, points → GD → goals → fair play → FIFA
ranking, in plain icon-illustrated language.

### 7.2 Result entry

Clicking a `MatchCard` opens `ScoreDialog` as a native `<dialog>` via `showModal()`, focus-trapped, Esc-closable and
scroll-locked.
It contains `ScoreInput`, which is two `StepperInput` goal counters taking non-negative integers, and
`DisciplineInput`, which is Gelb and Rot steppers for Heim and Gast defaulting to 0.
While a knockout score is level, a second stepper pair ("Elfmeterschießen") is shown automatically for the per-side
penalty goals.
A knockout match can't end level, so a level score means "goes to a shootout".
Saving is blocked with an error while the shootout score is level too.
Match cards display the folded score, with penalty goals added, alongside a small "i.E." badge.
The dialog pre-fills an existing result, and "Löschen" clears it.
Saving pushes an ARIA-live announcement of "Ergebnis gespeichert: …".
Knockout cards are disabled while either side is unresolved.
If saving or clearing would change which teams a later knockout match's stored result applies to, a confirm dialog
lists the affected matches and cascade-clears them only on confirmation.

### 7.3 Knockout view

`BracketView` lays the 32 matches into 5 round columns: Runde der 32, Achtelfinale, Viertelfinale, Halbfinale and
Finale, where the Finale column also holds "Spiel um Platz 3".
It is horizontally scrollable on narrow screens with sticky round headers.
Teams are resolved reactively via `resolveTeamRef`, and unresolved sides show German placeholders such as "Sieger
Gruppe A", "Bester 3. Platz" and "Sieger Sp. 73".
An **`OriginColumn`** lists each group's top 3 with the qualification cut.
Hovering or focusing a qualifying row highlights the matching bracket slots via the connector composable.
Each unresolved slot offers a "Mögliche Teams" affordance opening `PossibleTeamsDialog`, with Heim and Gast lists of
still-possible teams.

### 7.4 Ranking view

A full FIFA ranking table showing Rang, Mannschaft and Punkte in de-DE number format.
WC 2026 participants get a tinted row plus a left accent strip, with color paired with a bold name and flag and never
used alone, and a clickable team-dialog link.

### 7.5 Team dialog

`TeamLabel` with `clickable` renders as a `<button>` with `aria-label="… – Details anzeigen"`, opening `TeamDialog`.
That is a native `<dialog>` with a flag, name and FIFA-ranking header and a scrollable focusable body.
It is used from standings and ranking rows.

There are two tabs, with "Team" selected by default:

- **Team** shows an overall stats row of Sp/S/U/N/Tore/Gegentore/Gelb/Rot, aggregated across all played matches
  including knockouts.
  Below it sits the `SquadList` roster table of Nr / Position / Name, with the German position labels Torwart, Abwehr,
  Mittelfeld and Sturm.
- **Spielplan** shows the team's matches via `TeamSchedule`, latest kickoff first, each preceded by a stage label such
  as "Gruppenspiel 2/3" or "Achtelfinale".
  It reuses `MatchCard` with `hide-link-icon`, so no connector icon and no datetime highlight toggle, but keeps the
  normal click-to-edit behaviour, opening `ScoreDialog` nested on top.
  Knockout matches only appear once this team's side of the bracket resolves to it, and the other side may still show
  a placeholder.

### 7.6 Settings view

A theme radio group of Hell ☀️, Dunkel 🌙 and System 🖥️, rendered by `ThemePicker`.
Alongside it sit Exportieren, Importieren, Zurücksetzen and "Ergebnisse abrufen".
Reset and import-replace go through an accessible `ConfirmDialog`.
"Ergebnisse abrufen" opens `SyncDialog`, which confirms before fetching and then reports how many matches were
updated.
Import errors are shown as German messages.

---

## 8. Cross-cutting non-functional requirements

### Accessibility (WCAG AA; axe-core clean on every route)

- Semantic HTML using `<nav>`, `<main>`, `<table>`, `<button>` and `<dialog>`.
- Visible focus rings, with focus managed on route change and on dialog open and close.
- Contrast of at least 4.5:1 for body text and at least 3:1 for large text and UI.
- State is never conveyed by color alone, so W/D/L use color plus a glyph or letter.
- Form labels are properly associated.
- An ARIA live region for score and dialog announcements.
- Full keyboard support via Tab, Enter, Space and Esc.
- `prefers-reduced-motion` is honored.

### Design for young readers

- Big flags as the primary identifier.
- Large score numerals, at least 32 px on mobile.
- Recognizable iconography paired with short German labels.
- Plain German vocabulary and generous spacing.
- Base font of at least 18 px on mobile.

### Layout & styling

- Mobile-first, designed at 360 px and scaled up with `min-width` queries.
- CSS Grid for 2-D layouts and Flexbox for 1-D.
- Tap targets of at least 44×44 px.
- Components set padding only, and margins are the parent's job.
- Logic stays out of components and lives in `src/lib/`.
- Small, single-responsibility components.

### PWA

- `registerType: 'prompt'`, so an updated service worker installs and waits rather than activating on its own.
  `UpdateDialog.vue` surfaces the waiting update and lets the user trigger the reload.
- A German manifest with `name` "WM 2026 Tracker", `short_name` "WM 2026", `lang: 'de'`, `id: '.'` and theme color
  `#0f172a`.
- Icons at 192, 512 and maskable-512.
- Workbox precaches the built shell and assets.
  `navigateFallback` and `directoryIndex` are both `null`, so navigations go through a `NetworkFirst` runtime route
  instead of being served cache-first from the precached `index.html`.
  That precached `index.html` stays as the last-resort offline fallback via `handlerDidError`.
- Fully functional offline, verified by an offline Playwright context.

See [`docs/pwa-architecture.md`](./pwa-architecture.md) for the full request-handling and update flow.

### Verification gates

- `typecheck`, `lint` and `format:check` are clean.
- Unit tests and e2e tests, including axe-core, are all green.
- The production build installs as a PWA and works offline.

---

## 9. Ambiguities & loopholes

1. **Simplified fair-play.** `−1·yellow − 3·red` deliberately diverges from FIFA's finer-grained official values.
   This is documented, but it is a known deviation.
2. **FIFA ranking replaces drawing of lots.** This is deterministic and convenient, but not what FIFA actually does.
   Identical-ranking edge cases can't occur, because ranking positions are unique in the dataset.
3. **`possibleTeamsFor` for groupRank is a bounded heuristic.** It samples scores in an adaptive per-side range, wider
   with fewer remaining matches, lifted to cover any current goal-difference deficit.
   The total combinations explored across all remaining matches is clamped to a fixed budget,
   `MAX_ENUMERATION_COMBOS` in `possible-teams.ts`.
   That keeps the pathological case, a lopsided result with several matches left, from freezing the main thread.
   The clamp only engages outside the common case.
   In principle an outcome only reachable via a scoreline outside the possibly-clamped range could be missed.
   This is practically adequate, and the bound is chosen for performance.
4. **`thirdPlace` possible-teams is approximate** while groups are incomplete, using an Annex-C source-group scan.
   It only becomes exact once all groups finish.
5. **Penalty shootouts carry only per-side totals**, with no kick-by-kick data.
   A level knockout result _without_ shootout goals means "not decided yet" and leaves the slot unresolved.
   Data synced or entered before v2 may carry folded shootout scores that now read as regular-time wins, absorbed by
   the v1 → v2 migration, see §5.5.
6. **No live or finished status is surfaced.** A match's state is implicit, meaning it has a result or it doesn't.
   Kickoff time is shown but not used to label progress.
7. **Snapshot data freshness.** Teams, squads, fixtures and the FIFA ranking are hard-coded snapshots from 11 and 28
   June 2026.
   Real-world roster and result changes require re-running the fetch scripts, since the app has no live update path.
8. **Import and rehydration trust boundary.** `parseImport` and the localStorage `afterHydrate` hook both check that
   every key is a real fixture id, that `result.matchId` matches its key, and that shootout fields obey the `Result`
   invariants.
   A level score on a knockout match without a shootout is still accepted and simply leaves the slot unresolved.
9. **Schema migrations.** The v1 → v2 path exists, with identity on fields, a new localStorage key and legacy-key
   adoption, and it is covered by tests.
