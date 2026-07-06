# Requirements — World Cup 2026 Tracker

Offline-first PWA to track the **FIFA World Cup 2026**: view the full schedule,
enter real match results, and have group standings and the entire knockout
bracket computed automatically. Reconstructed from the project's plan, docs, and
the current implementation. Where the shipped code and the planning docs
disagree, the **code is authoritative** and the gap is listed in
§ "Implementation vs. documented-requirement mismatches".

---

## 1. Product scope

- **Result tracker only** — no predictions/tipping, no scoring of guesses.
- Single-user, single-device. State lives in `localStorage`; the only sharing
  mechanism is manual JSON export/import.
- The tournament is already underway at ship time, so the app must support
  back-filling already-played matches from day one.
- **Live score fetch** (opt-in, per match) — `ScoreDialog` offers an "Ergebnis
  holen" button that pulls finished results from ESPN's public scoreboard API
  (`src/lib/results-sync/`) and fills the score/card fields for review; nothing
  is written to the store until the user saves.
- **UI language: German** (all user-facing strings). **Code language: English**
  (files, identifiers, comments).

### Out of scope (explicit)

- Predictions/tipping (scoring of guesses)
- Multi-user or cross-device sync
- Cloud backup
- Venue / stadium / referee data
- UI languages other than German
- Manual override of deduced knockout matchups
- Penalty-shootout _kick-by-kick_ scores as data (only the shootout winner is
  recorded, via `Result.shootoutWinner`; `homeGoals`/`awayGoals` always stay
  the real regulation/AET score)
- Disciplinary suspensions
- Squad changes

---

## 2. Tech stack & conventions

- **Vue 3** (`<script setup>` Composition API) + **Vite** + **TypeScript 6**.
- **Pinia** + `pinia-plugin-persistedstate` for state; **Vue Router** (history
  mode, respects `BASE_URL`).
- **`vite-plugin-pwa`** (`registerType: 'autoUpdate'`, Workbox `generateSW`).
- **`flag-icons`** (lipis) for flags — must support GB constituent nations
  (`gb-eng`, `gb-sct`, `gb-wls`).
- No UI framework. Plain CSS with custom-property **design tokens**
  (`src/styles/tokens.css`), Andy Bell modern reset (`reset.css`), shared base
  styles (`base.css`).
- **Vitest** + `@vue/test-utils` (unit, co-located `*.spec.ts`); **Playwright**
  - `@axe-core/playwright` (e2e in `/e2e`). Separate Playwright config for the
    offline PWA test.
- **oxlint** + **oxfmt** for lint/format.
- **All npm dependencies pinned to exact versions** — no `^`/`~` (enforced by
  convention/CI). `docs/` keeps one note file per significant dependency.
- **Non-mutating array methods only** (`toSorted`/`toReversed`/`toSpliced`);
  `oxlint unicorn/no-array-sort` enforces this.
- Per-dependency upgrade notes maintained under `docs/` before behavior-changing
  upgrades land.

---

## 3. Domain model (`src/types/tournament.ts`)

- `GroupId` — `'A'..'L'` (12 groups), derived from a `GROUP_IDS` const array.
- `Stage` — `'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'`.
- `Team` — readonly `id` (lower-case FIFA code), German `name`, `flagCode`,
  `group`, `fifaRanking` (World Ranking position; lower = better).
- `Player` — readonly `number`, `name`, `position` (`GK|DF|MF|FW`, always present).
- `TeamRef` (a possibly-unresolved team pointer):
  `team` | `groupRank{group,rank:1|2}` | `thirdPlace{slot:1..8}` |
  `matchWinner{matchId}` | `matchLoser{matchId}` (loser only for 3rd-place play-off).
- `MatchSlot` — a discriminated union on `stage`: `GroupMatchSlot` (`stage:
'group'`, non-optional `group`, `homeRef`/`awayRef` narrowed to
  `ResolvedTeamRef` — group matches always reference concrete teams) or
  `KnockoutMatchSlot` (any other stage, no `group`, `homeRef`/`awayRef` the
  full `TeamRef`). Both carry `id` (`'M01'..'M104'`) and ISO-8601 `kickoff`
  (with venue UTC offset).
- `Result` — `matchId`, `homeGoals`, `awayGoals`, `homeYellow/homeRed`,
  `awayYellow/awayRed` (red includes second-yellow), optional
  `shootoutWinner: 'home'|'away'` — set only when a knockout match was decided
  by a penalty shootout; `homeGoals`/`awayGoals` stay the real regulation/AET
  score (typically level in that case) rather than encoding the shootout
  result as goals.
- `ResultsMap` — `Readonly<Record<string, Result>>`; used at every read-only
  call site instead of restating the `Record` shape.
- `PersistedState` — `{ version, results: ResultsMap }`.
- `ThirdPlaceKey` — branded sorted-group-letters string; built via
  `toThirdPlaceKey(groups)`; used to index the Annex C allocation table.

Only the **results map** is mutable/persisted; everything else (standings,
third-place ranking, knockout matchups) is **derived** by pure functions.

---

## 4. Static data

- **`teams.ts`** — 48 qualified teams (final-draw groups; play-off slots
  resolved to actual March 2026 winners), German names, `flag-icons` codes, FIFA
  ranking from the **11 June 2026** snapshot.
- **`fixtures-2026.ts`** — all **104** `MatchSlot`s:
  - 72 group matches (`M01`–`M72`) with real kickoffs; each team plays exactly 3.
  - 32 knockout matches (`M73`–`M104`): 16 R32, 8 R16, 4 QF, 2 SF, 1 third-place
    play-off, 1 final, chained via the `TeamRef` kinds.
  - **`THIRD_PLACE_ALLOCATION`** — verbatim FIFA "Annex C" table, all 495
    combinations (`C(12,8)`) keyed by sorted qualifying-group letters, plus
    `THIRD_PLACE_SLOT_HOST` mapping the 8 third-place slots to host groups. This
    table is **the** source of truth and must never be recomputed by intuition.
- **`squads.ts`** — 48 × 26 players (shirt number, Latin-script name, position);
  read-only; generated by `scripts/fetch-squads.py` from Wikipedia.
- **`fifa-ranking.ts`** — full FIFA ranking (all 211 associations, with points,
  11 June 2026 release); generated by `scripts/fetch-fifa-ranking.py`. The 48 WC
  teams sit at exactly the positions stored as `Team.fifaRanking` (test-guarded).

Sanity unit tests: 104 unique ids, 3 group matches/team, every knockout slot
reachable, every team has a squad and a FIFA ranking.

---

## 5. Business logic (`src/lib/`, pure & unit-tested)

### 5.1 Group standings & tiebreakers (`standings.ts`, `tiebreakers.ts`)

Teams are first separated by **points** (3/1/0). Equal-points teams go through
the FIFA Article 13 chain — see
[`docs/tournament-rules.md`](../docs/tournament-rules.md) for the full,
regulation-sourced description; in short, for the **2026** tournament:

- **Step 1 — head-to-head** among all tied teams (matches between them only):
  points → goal difference → goals scored.
- **Step 2 — for teams still tied after Step 1:** re-apply the same three
  head-to-head criteria to the matches among only the still-tied subset; if
  that still doesn't decide it, apply **overall** goal difference → overall
  goals scored → fair-play score → FIFA World Ranking, **without restarting**
  the chain (a "no-restart" sequence, not a fresh Step 1).
- **Fair-play score** — simplified: `score = −1·yellow − 3·red` summed across
  group matches; higher (less negative) is better.
- **FIFA World Ranking** — deterministic final tiebreaker (lower position =
  better); **replaces FIFA's drawing-of-lots** step, and always resolves since
  ranking positions are unique — no unresolved-tie UI state.

Note the 2026 reordering versus 2018/2022: **head-to-head (Step 1) is applied
_before_ overall goal difference** (Step 2), not after.

### 5.2 Third place (`third-place.ts`)

Rank all 12 third-placed teams by the cross-group chain (pts → GD → GF →
fair-play → FIFA ranking; no H2H, different groups). `rankThirdPlaced` returns
`null` until all 12 groups complete. `rankThirdPlacedLive` always returns the
current ranking plus a `final` flag (true once all 12 groups are complete) —
used by the groups view to show a live "who currently qualifies" table before
the group stage ends. `resolveThirdPlaceSlot` takes the top 8, builds the
sorted key, looks up `THIRD_PLACE_ALLOCATION`, maps host group → source group
→ team.

### 5.3 Knockout resolution (`knockout.ts`)

`resolveTeamRef(ref, results) → Team | null` walks the full `TeamRef` chain,
returning `null` at any unresolved step. For a level knockout match it falls
back to `shootoutWinner`; returns `null` if scores are level and no shootout
winner is set. `MatchCard` disables result entry (`blocked`, derived from
`resolveTeamRef` returning `null` for either side) while either side is
unresolved.

### 5.4 Possible teams (headline feature, `possible-teams.ts`)

`possibleTeamsFor(ref, results) → Set<Team>` enumerates every team that could
still fill an unresolved slot:

- **`groupRank`**: enumerate plausible scores for remaining group matches — an
  adaptive per-side range, lifted to cover the current goal-difference spread
  and clamped to a fixed total-combinations budget (see § "Ambiguities" #3) —
  collect every team reaching the target rank in ≥1 scenario; early-exit when
  all group teams found. **Memoized** per `(group, rank, result-fingerprint)`.
- **`thirdPlace`**: exact via `resolveThirdPlaceSlot` once all groups complete;
  otherwise approximate by scanning Annex C for possible source groups and
  collecting their rank-3 candidates.
- **`matchWinner`/`matchLoser`**: exact if played; else union of upstream home &
  away possibilities (recurses).
- **`team`**: singleton (or empty for unknown id).

Memoization memory is proactively freed on any result change/reset/import
(`freePossibleTeamsMemory`) — memory hygiene only, not a correctness
requirement, since cache entries are keyed by a full result fingerprint and
can never serve stale data.

### 5.5 Persistence (`persistence.ts`)

- `SCHEMA_VERSION = 1`; localStorage key `wc2026:results:v1` (versioned).
- `exportJson(results)` downloads `wc2026-results-YYYY-MM-DD.json`
  (`{ version, results }`).
- `parseImport(text)` parses and **validates**: version match, rejects arrays,
  per-result field validation (all six counts non-negative integers, optional
  `shootoutWinner`), every key must be a real fixture id, and `result.matchId`
  must equal its own key — throws a German error on any violation.
- localStorage rehydration on app load goes through the same validator
  (`isValidResultsMap`, exported from `persistence.ts`) via an `afterHydrate`
  hook on the `tournament` store's persistence plugin; a corrupted or
  hand-edited entry resets to an empty state instead of propagating garbage
  into `computeGroupStandings` and friends.

---

## 6. State (Pinia)

- **`tournament`** store — `results: ResultsMap`; actions
  `enterResult`, `clearResult`, `reset`, `importResults`; persisted under the
  versioned key.
- **`settings`** store — `theme: 'light' | 'dark'` (default `'light'`),
  persisted. `App.vue` applies it via `document.documentElement.dataset.theme`.

---

## 7. UI / routes

Bottom navigation derived from router meta (`navIcon` + German `title`); browser
tab title synced to route. Four routes:

| Route       | Title (DE)    | Content                                          |
| ----------- | ------------- | ------------------------------------------------ |
| `/groups`   | Gruppen       | 12 group cards (standings table + 6 match cards) |
| `/knockout` | K.-o.-Runde   | Knockout bracket + group-origin column           |
| `/ranking`  | Weltrangliste | Full FIFA ranking, WC participants highlighted   |
| `/settings` | Einstellungen | Theme picker + export / import / reset           |

`/` redirects to `/groups`.

### 7.1 Groups view

12 `GroupTable`s in a responsive CSS Grid (1→2→3→4 cols by width). Each table:
standings rows (rank, `TeamLabel`, P/W/D/L/GF/GA/GD/Pts, recent-form
`OutcomeBadge`s) computed reactively, plus the 6 group matches as `MatchCard`s.

Below the grid, `ThirdPlaceTable` ("Die besten 8 Drittplatzierten") shows all
12 current third-placed teams ranked by `rankThirdPlacedLive`
(`third-place.ts`) — live, even before the group stage finishes. Each
`ThirdPlaceRow` shows only the columns relevant to the cross-group tiebreaker
chain, in breaking order: group letter, points, goal difference, goals
scored, fair-play score, FIFA ranking. The top 8 are marked
"sicher"/"qualifiziert" (green) and the rest "gefährdet"/"ausgeschieden"
(red) — "sicher"/"gefährdet" while the group stage is still running,
"qualifiziert"/"ausgeschieden" once all 12 groups are complete, mirroring the
in-group status treatment in `StandingsRow`. An `InfoDisclosure`, placed above
the table, explains the tiebreaker chain (points → GD → goals → fair play →
FIFA ranking) in plain, icon-illustrated language.

### 7.2 Result entry

Clicking a `MatchCard` opens `ScoreDialog` (native `<dialog>` `showModal()`,
focus-trapped, Esc closes, scroll-locked). Contains `ScoreInput` (two
`StepperInput` goal counters, non-negative integers) and `DisciplineInput`
(Gelb/Rot steppers for Heim & Gast, default 0). For knockout matches that are
level it shows an "🥅 Elfmeterschießen — Sieger" toggle (two `aria-pressed`
buttons) that sets `shootoutWinner`; it clears itself when scores diverge.
Pre-fills an existing result; "Löschen" clears it. Saving pushes an ARIA-live
announcement ("Ergebnis gespeichert: …"). Knockout cards are disabled while
either side is unresolved. If saving or clearing would change which teams a
later knockout match's stored result applies to, a confirm dialog lists the
affected matches and cascade-clears them only on confirmation.

### 7.3 Knockout view

`BracketView` lays the 32 matches into 5 round columns (Runde der 32,
Achtelfinale, Viertelfinale, Halbfinale, Finale — Finale column also holds "Spiel
um Platz 3"), horizontally scrollable on narrow screens with sticky round
headers. Teams resolved reactively via `resolveTeamRef`; unresolved sides show
German placeholders ("Sieger Gruppe A", "Bester 3. Platz", "Sieger Sp. 73" …).
An **`OriginColumn`** lists each group's top-3 with the qualification cut; hovering/
focusing a qualifying row highlights the matching bracket slot(s) (connector
composable). Each unresolved slot offers a "Mögliche Teams" affordance opening
`PossibleTeamsDialog` (Heim/Gast lists of still-possible teams).

### 7.4 Ranking view

Full FIFA ranking table (rang / Mannschaft / Punkte, de-DE number format). WC
2026 participants get a tinted row + left accent strip (color paired with bold
name/flag, never color-alone) and a clickable team-dialog link.

### 7.5 Team dialog

`TeamLabel` with `clickable` renders as a `<button>` (`aria-label="… – Details
anzeigen"`) opening `TeamDialog` (native `<dialog>`, flag+name+FIFA-ranking
header, scrollable focusable body). Used from standings and ranking rows.

Two tabs, "Team" selected by default:

- **Team** — overall stats row (Sp/S/U/N/Tore/Gegentore/Gelb/Rot, aggregated
  across all played matches including knockouts) above the `SquadList` roster
  table: Nr / Position / Name with German position labels
  Torwart/Abwehr/Mittelfeld/Sturm.
- **Spielplan** — the team's matches (`TeamSchedule`), latest kickoff first,
  each preceded by a stage label ("Gruppenspiel 2/3", "Achtelfinale", …).
  Reuses `MatchCard` with `hide-link-icon` (no connector icon, no datetime
  highlight toggle) but keeps the normal click-to-edit behaviour, opening
  `ScoreDialog` nested on top. Knockout matches only appear once this team's
  side of the bracket resolves to it; the other side may still show a
  placeholder.

### 7.6 Settings view

Theme radio group (Hell ☀️ / Dunkel 🌙); Exportieren / Importieren /
Zurücksetzen. Reset and import-replace go through an accessible `ConfirmDialog`.
Import errors shown as German messages.

---

## 8. Cross-cutting non-functional requirements

### Accessibility (WCAG AA; axe-core clean on every route)

- Semantic HTML (`<nav>`, `<main>`, `<table>`, `<button>`, `<dialog>`).
- Visible focus rings; focus managed on route change and dialog open/close.
- Contrast ≥ 4.5:1 body, ≥ 3:1 large/UI.
- State never conveyed by color alone\*\* — W/D/L use color and glyph/letter.
- Form labels properly associated.
- ARIA live region for score + dialog announcements.
- Full keyboard support (Tab / Enter / Space / Esc).
- `prefers-reduced-motion` honored.

### Design for young readers

- Big flags as the primary identifier.
- Large score numerals (≥ 32 px mobile).
- Recognizable iconography paired with short German labels.
- Plain German vocabulary, generous spacing.
- Base font ≥ 18 px mobile.

### Layout & styling

- Mobile-first — design at 360 px, scale up with `min-width` queries.
- CSS Grid for 2-D layouts, Flexbox for 1-D.
- Tap targets ≥ 44×44 px.
- Components set padding only; margins are the parent's job.
- Logic stays out of components (lives in `src/lib/`).
- Small, single-responsibility components.

### PWA

- `registerType: 'autoUpdate'`.
- German manifest: `name` "WM 2026 Tracker", `short_name` "WM 2026",
  `lang: 'de'`, theme color `#0f172a`.
- Icons: 192, 512, maskable-512.
- Workbox precaches the built shell + assets; `navigateFallback` to `index.html`.
- Fully functional off (verified by an offline Playwright context).

### Verification gates

- `typecheck`, `lint`, and `format:check` clean.
- Unit tests and e2e tests (incl. axe-core) all green.
- Production build installs as a PWA and works offline.

---

## 9. Ambiguities & loopholes

1. **Simplified fair-play** (`−1·yellow − 3·red`) deliberately diverges from
   FIFA's finer-grained official values. Documented, but a known deviation.
2. **FIFA ranking replaces drawing of lots.** Deterministic and convenient, but
   not what FIFA actually does; identical-ranking edge cases can't occur because
   ranking positions are unique in the dataset.
3. **`possibleTeamsFor` (groupRank) is a bounded heuristic.** It samples scores
   in an adaptive per-side range (wider with fewer remaining matches), lifted
   to cover any current goal-difference deficit — but the total combinations
   explored across all remaining matches is clamped to a fixed budget
   (`MAX_ENUMERATION_COMBOS` in `possible-teams.ts`) to keep the pathological
   case (a lopsided result with several matches left) from freezing the main
   thread. The clamp only engages outside the common case; in principle an
   outcome only reachable via a scoreline outside the (possibly clamped) range
   could be missed. Practically adequate; bound chosen for performance.
4. **`thirdPlace` possible-teams is approximate** while groups are incomplete
   (Annex-C source-group scan), only becoming exact once all groups finish.
5. **Penalty shootouts store the real regulation/AET score plus a winner**
   (`Result.shootoutWinner`), not a kick-by-kick shootout score; a level
   knockout result without `shootoutWinner` leaves the slot unresolved.
6. **No live/finished status** is surfaced anymore (badges removed) — a match's
   state is implicit (has a result or not); kickoff time is shown but not used to
   label progress.
7. **Snapshot data freshness.** Teams, squads, fixtures, and FIFA ranking are
   hard-coded snapshots (11/28 June 2026). Real-world roster/result changes
   require re-running the fetch scripts; the app has no live update path.
8. **Import/rehydration trust boundary.** `parseImport` and the localStorage
   `afterHydrate` hook both check that every key is a real fixture id and that
   `result.matchId` matches its key, but don't check cross-field consistency
   (e.g. a `shootoutWinner` set on a non-level score, or set on a group-stage
   match).
9. **Schema migrations** are specified (versioned key) but only `version 1`
   exists; no migration code path is exercised yet.
