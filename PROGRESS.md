# Implementation progress

Tracks milestone status against [`IMPL_PLAN.md`](./IMPL_PLAN.md). Each milestone
ends with a runnable app + green tests.

| Milestone                                  | Status  | Notes                                                              |
| ------------------------------------------ | ------- | ------------------------------------------------------------------ |
| M1 — Scaffold                              | ✅ Done | Vite + Vue 3 + TS shell, 3 routes, tooling, smoke tests            |
| M2 — Domain + fixture data                 | ✅ Done | Types, 48 teams, 104 fixtures, Annex C table, sanity tests         |
| M3 — Group view (read-only)                | ✅ Done | 12 group cards, flags, matches, sticky header                      |
| M4 — Result entry + standings              | ✅ Done | Pinia store, full FIFA tiebreakers, ScoreDialog, standings         |
| M5 — Persistence + export/import           | ✅ Done | localStorage persist, JSON export/import, SettingsView             |
| M6 — Knockout deduction                    | ✅ Done | third-place ranking, resolveTeamRef, canEnterResult, tests         |
| M7 — Knockout bracket view                 | ✅ Done | BracketView + BracketRound + placeholder labels, ScoreDialog wired |
| M8 — PWA                                   | ✅ Done | vite-plugin-pwa Workbox precache, icons, offline e2e tests         |
| M9 — Polish                                | ✅ Done | Status badges, penalty winner, aria-label fix, contrast fix        |
| M10 — Squad viewer                         | ✅ Done | squads.ts (48×26), SquadDialog, SquadList, TeamLabel clickable     |
| M11 — Possible matchups (headline feature) | ✅ Done | possible-teams.ts, PossibleTeamsButton/Dialog, BracketRound wired  |

## M11 — Possible matchups (completed 2026-06-28)

Delivered:

- `src/lib/possible-teams.ts` — `possibleTeamsFor(ref, results): Set<Team>` enumerates
  every team that could still fill an unresolved `TeamRef`.

  - **`groupRank`**: iterates plausible score combos for remaining group matches,
    collecting every team that can achieve the target rank in at least one scenario.
    Score range is adaptive: 0–6 per side for ≤3 remaining matches (≤117k combos),
    narrowing to 0–2 per side for 6 remaining (≤531k combos). Early-exit as soon as
    all teams in the group have been found at the target rank. Memoized per
    `(group, rank, result-fingerprint)` — subsequent calls with same inputs are O(1).
  - **`thirdPlace`**: when all groups complete, delegates to `resolveThirdPlaceSlot`
    for exact resolution (1 team). When some groups are incomplete, approximates by
    scanning the 495-entry Annex C allocation table for all groups that could be source
    groups for the slot, then collecting rank-3 candidates from those groups.
  - **`matchWinner` / `matchLoser`**: if the match is played, delegates to `resolveTeamRef`
    for an exact answer. If unplayed, returns the union of possible home and away teams
    (either could win or lose).
  - **`team`**: singleton set with the concrete team (or empty for unknown ids).

- `src/components/PossibleTeamsButton.vue` — compact block button shown below each
  unresolved bracket match card (`v-if="!row.homeTeam || !row.awayTeam"` in
  BracketRound). Computes possible home/away team lists reactively from the Pinia store,
  labels each side using `teamRefLabel`, and opens `PossibleTeamsDialog` via Teleport.

- `src/components/PossibleTeamsDialog.vue` — native `<dialog>` with `showModal()`. Shows
  a "Heim" section and/or "Gast" section (only for unresolved slots), each listing teams
  as flag + name (`--flag-size: 1.5rem`). Close button and Esc to dismiss.

- `src/components/BracketRound.vue` — one line added: `<PossibleTeamsButton v-if="!row.homeTeam || !row.awayTeam" :match="row.match" />` after each `<MatchCard>`.

- `src/lib/possible-teams.spec.ts` — 18 Vitest unit tests:
  - Deterministic group (all played): returns exactly the team at that rank.
  - 1 match remaining: exactly 2 teams reachable for rank 1 (constructed Group A
    scenario with mex+kor on 6 pts each, cze+rsa on 1 pt with no remaining matches).
  - No matches played: all 4 group teams are possible rank-1 candidates.
  - thirdPlace: non-empty with some or all group results; different slots return
    different team sets.
  - matchWinner unplayed: union of upstream possibilities (8 teams when neither group
    has results); played: exactly 1 team (or 0 for unresolved draw).
  - team kind: singleton or empty.
  - Memoization: same inputs → same content on second call.
  - Deep chain: R16 matchWinner-of-matchWinner returns ≥2 teams.

- `e2e/possible-teams.spec.ts` — 10 Playwright tests:
  - 16 "Mögliche Teams" buttons appear in R32 when no group results entered.
  - Buttons vanish from R32 once all group results are seeded.
  - Dialog opens, shows team names + flags, close button and Esc work.
  - M73 (A2 vs B2) shows 8 items (4 from group A + 4 from group B) with no results.
  - R16 slot shows 4 items (2 per side) when group results are seeded but R32 unplayed.
  - axe-core a11y scan passes for both the open dialog and the knockout view.

**Verify:** `npm run typecheck` clean, `npm run lint` clean,
`npm run test:unit` (113 pass), `npm run test:e2e` (49 pass — all axe checks green).

## M10 — Squad viewer (completed 2026-06-28)

Delivered:

- `scripts/fetch-squads.py` — standalone Python 3 script (stdlib only) that
  downloads the Wikipedia wikitext via the MediaWiki API, parses all
  `{{nat fs g player|...}}` templates (48 teams × 26 players = 1 248 rows),
  strips wiki markup from player names, and writes `src/data/squads.ts`.
  Re-runnable whenever roster changes need to be refreshed.

- `src/data/squads.ts` — 48 teams × 26 players, shirt number + Latin-script
  name + position (`GK/DF/MF/FW`). Source: Wikipedia 2026-06-28 snapshot.

- `src/components/SquadList.vue` — `<table>` with `<thead>` (Nr / Position /
  Name) and 26 `<tbody>` rows. German position labels (Torwart / Abwehr /
  Mittelfeld / Sturm). Hover highlight via `color-mix`.

- `src/components/SquadDialog.vue` — native `<dialog showModal()>`. Header
  shows team flag + name; body is a scrollable `SquadList` with `tabindex="0"`
  (required by WCAG 2.1.1 — `scrollable-region-focusable`); close button
  (✕) top-right; Esc to close via browser default. Emits `close` on dialog
  close event.

- `src/components/TeamLabel.vue` — new optional `clickable` prop. When true,
  renders as a `<button>` (with `aria-label="… – Kader anzeigen"`) and manages
  a SquadDialog internally via a `<Teleport to="body">` wrapper (avoids invalid
  nested-button HTML when TeamLabel is used inside MatchCard's button). When
  false (default), unchanged `<span>` — no behaviour change for MatchCard.

- `src/components/StandingsRow.vue` — passes `:clickable="true"` to TeamLabel
  so every team in the standings table opens its squad dialog.

- `src/data/squads.spec.ts` — 7 Vitest tests: has entry for every team; 26
  players per squad; ≥3 GKs per squad; unique shirt numbers; numbers 1–99; no
  blank names; all positions valid.

- `e2e/squads.spec.ts` — 5 Playwright tests: clicking a team button opens the
  dialog; 26 rows visible; Esc closes it; close button closes it; axe-core
  a11y scan of the open dialog passes.

**Verify:** `npm run typecheck` clean, `npm run lint` clean,
`npm run test:unit` (95 pass), `npm run test:e2e` (39 pass — all axe checks green).

## M9 — Polish (completed 2026-06-27)

Delivered:

- **Match status badges** (`geplant` / `läuft` / `beendet`) on every `<MatchCard>`:
  - `src/lib/match-status.ts` — pure `getMatchStatus(kickoff, hasResult)` function; returns
    `'upcoming' | 'live' | 'finished'`. `Date.now() >= kickoff → live`, presence of result →
    `finished`.
  - `MatchCard.vue` — `<div class="match-card__meta">` wraps kickoff time + new status chip.
    Status chip uses `--color-draw` (amber) / `--color-win` (green) solid backgrounds with
    `--color-primary-contrast` text to meet WCAG AA 4.5:1 contrast at 12 px.

- **Penalty shootout winner** for knockout draws (resolves M6 known limitation):
  - `tournament.ts` — `Result.penaltyWinner?: 'home' | 'away' | null` (optional; absent on
    group-stage and non-drawn knockout results; accepted by existing import data without it).
  - `knockout.ts` — `resolveTeamRef` now reads `penaltyWinner` when `homeGoals === awayGoals`
    in a knockout match; still returns `null` if neither score differs nor `penaltyWinner` is set.
  - `persistence.ts` — `isValidResult` validates the new optional field (accepts `undefined`,
    `null`, `'home'`, `'away'`; rejects anything else).
  - `ScoreDialog.vue` — shows a _„Elfmeterschießen — Sieger"_ toggle section (two `aria-pressed`
    buttons, one per team) whenever `match.stage !== 'group'` and current scores are tied; the
    section disappears and `penaltyWinner` is cleared when scores diverge.

- **aria-label bug fix** in `ScoreInput.vue` — four `aria-label="..."` static bindings
  (containing JS template literals) changed to `:aria-label="..."` dynamic bindings. They
  were rendering the raw backtick syntax as the label text.

- **`prefers-reduced-motion` skip-link** — explicit `@media (prefers-reduced-motion: reduce)`
  block in `base.css` for the skip-link transition (belt-and-suspenders; the Andy Bell reset
  already covers this globally).

- **Tests** (88 unit tests, 34 e2e, all green):
  - `src/lib/match-status.spec.ts` — 5 unit tests for `getMatchStatus` with `vi.useFakeTimers`.
  - `src/lib/persistence.spec.ts` — 11 unit tests for `parseImport` covering valid data,
    malformed JSON, wrong version, missing fields, and all `penaltyWinner` variants.
  - `src/lib/knockout.spec.ts` — 3 new tests: draw without `penaltyWinner` returns null;
    home/away penalty winner resolves correctly.
  - `e2e/groups.spec.ts` — 2 new tests: "läuft" badge with frozen clock; "beendet" badge
    after seeding a result.
  - `e2e/knockout.spec.ts` — 4 new tests: "geplant" badge with frozen clock; penalty section
    hidden/shown on score changes; saving tied result with penalty winner propagates bracket.

**Verify:** `npm run typecheck` clean, `npm run lint` clean, `npm run test:unit` (88 pass),
`npm run test:e2e` (34 pass, all axe-core a11y checks green).

## M8 — PWA (completed 2026-06-27)

Delivered:

- `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` — soccer-ball
  app icons generated from an SVG source via ImageMagick. Dark navy background
  (`#0f172a`), white ball with blue center pentagon, "2026" label.
- `vite.config.ts` — fleshed out `VitePWA` config: `workbox.globPatterns` precaches
  all JS, CSS, HTML, PNG, SVG, and font assets (162 entries, ~4.3 MB); `navigateFallback:
'index.html'` ensures all deep-links are served from cache offline. Full manifest
  with `description`, `icons` array (192, 512, maskable 512).
- `playwright.pwa.config.ts` — separate Playwright config pointing at `vite preview`
  (port 4173), matching only `pwa-offline.spec.ts`.
- `e2e/pwa-offline.spec.ts` — two tests: (1) app loads from production build; (2) app
  works fully offline — primes the SW cache in the online phase of the same context,
  then calls `context.setOffline(true)` and verifies in-page navigation + full
  `page.goto('/')` are served from the Workbox precache.
- `playwright.config.ts` — added `testIgnore: ['**/pwa-offline.spec.ts']` so the
  offline test doesn't bleed into the regular dev-server test run.
- `package.json` — added `test:e2e:pwa` script.

**Build output:** `dist/sw.js` + `dist/workbox-*.js` + `dist/manifest.webmanifest`
generated by `vite-plugin-pwa` 1.3.0 in `generateSW` mode.

**Verify:** `npm run typecheck` clean, `npm run lint` clean, `npm run test:unit`
(70 pass), `npm run test:e2e` (28 pass, pwa-offline excluded), `npm run build &&
npm run test:e2e:pwa` (2 pass — online load + offline navigation).

## M7 — Knockout bracket view (completed 2026-06-27)

Delivered:

- `src/lib/bracket-labels.ts` — `teamRefLabel(ref) → string`: generates meaningful
  German placeholder text for any unresolved `TeamRef` (e.g. `groupRank` rank 1 →
  `"Sieger Gruppe A"`, `thirdPlace` → `"Bester 3. Platz"`, `matchWinner` →
  `"Sieger Sp. 73"`).
- `src/components/MatchCard.vue` — added optional `homePlaceholder` / `awayPlaceholder`
  props; shown instead of `?` when the team ref is unresolved.
- `src/components/BracketRound.vue` — presentational column component: sticky blue
  header, stacked `<MatchCard>` entries, optional per-match `sectionLabel` (used for
  the Finale column to label "Spiel um Platz 3" vs "Finale" within the same round).
- `src/components/BracketView.vue` — groups the 32 knockout matches into 5 round
  columns (Runde der 32, Achtelfinale, Viertelfinale, Halbfinale, Finale). Resolves
  teams via `resolveTeamRef` reactively from the Pinia store. Horizontal-scrolling
  flex container (`overflow-x: auto`, `min-width: max-content`) for narrow screens.
  Emits `matchClick` up to the view.
- `src/views/KnockoutView.vue` — page view: renders `<BracketView>`, manages
  `selectedMatch` state, resolves home/away teams for the selected match, mounts
  `<ScoreDialog>` on demand.

**Verify:** `npm run typecheck` clean, `npm run test:unit` (63 pass), `npm run lint`
clean. Browser: all 5 round headers visible, 32 match cards, placeholder labels
correct, all R32 cards disabled until group results entered, ScoreDialog opens on
click with correct team names (flags + scores), Esc closes it. Horizontal scroll
works at 390 px viewport (scrollWidth 1464 vs clientWidth 358).

## M6 — Knockout deduction (completed 2026-06-27)

Delivered:

- `src/lib/third-place.ts` — `rankThirdPlaced(results) → TeamStat[] | null`: ranks
  all 12 third-placed teams using the cross-group tiebreaker chain (pts → GD → GF →
  fair-play → FIFA ranking; no H2H since teams come from different groups). Returns
  null until all 12 groups are complete. `resolveThirdPlaceSlot(slot, results) → Team | null`:
  takes the top 8, builds the `ABCDEFGH`-style key, looks up in `THIRD_PLACE_ALLOCATION`,
  maps hostGroup → sourceGroup → team.
- `src/lib/knockout.ts` — `resolveTeamRef(ref, results) → Team | null`: walks the
  full TeamRef chain (`team` / `groupRank` / `thirdPlace` / `matchWinner` / `matchLoser`),
  returning null at any unresolvable step. Draws in knockout matches return null for
  winner/loser (current model has no penalty field). `canEnterResult(match, results) →
boolean`: convenience predicate used to block result entry on unresolved knockout slots.
- `src/lib/third-place.spec.ts` — 11 unit tests: null until complete, 12 teams, one per
  group, sorted by pts/GD, slot tests (non-null, distinct, from top-8 groups).
- `src/lib/knockout.spec.ts` — 20 unit tests covering all TeamRef kinds, draw handling,
  `canEnterResult`, and full bracket propagation (R32→R16→QF→SF→Final).
- `src/components/MatchCard.vue` — button now carries `disabled` + `match-card--blocked`
  (cursor: not-allowed, opacity 0.5) when `homeTeam === null || awayTeam === null`.

**Known limitation:** knockout matches that go to penalties cannot yet identify the
winner — the `Result` model has no penalty field. Draw results in knockout leave
winner/loser as null. Addressed in M9 (Polish).

**Verify:** `npm run test:unit` (56 pass), `npm run typecheck` clean, `npm run lint` clean.

## M5 — Persistence + export/import (completed 2026-06-27)

Delivered:

- `pinia-plugin-persistedstate` wired to localStorage key `wc2026:results:v1`.
- `src/lib/persistence.ts` — `exportJson(results)` triggers download as
  `wc2026-results-YYYY-MM-DD.json`; `parseImport(text)` validates and returns the
  results map; schema version checked on import.
- `src/views/SettingsView.vue` — _Exportieren_, _Importieren_, _Zurücksetzen_ buttons
  with confirmation dialog on reset.

## M4 — Result entry + standings (completed 2026-06-27)

Delivered:

- `src/stores/tournament.ts` — Pinia store, `results: Record<string, Result>`, actions
  `enterResult` / `clearResult`, persisted to `localStorage` key `wc2026:results:v1`.
- `src/lib/tiebreakers.ts` — full FIFA 2026 tiebreaker chain (pts → GD → GF → H2H pts
  → H2H GD → H2H GF → fair-play → FIFA ranking). Recursive H2H: when H2H collapses
  N teams to a smaller sub-group, re-runs the chain on that subset. FIFA ranking is
  the deterministic last resort — always resolves.
- `src/lib/standings.ts` — `computeGroupStandings(groupId, results) → TeamStat[]`
  (sorted). `TeamStat` carries played/W/D/L/GF/GA/GD/pts/cards/fairPlayScore/form.
- `src/lib/standings.spec.ts` — 6 unit tests covering: GD resolves tie, H2H decides,
  3-way circular H2H collapse, fair-play decides, FIFA ranking decides.
- `src/composables/useAnnounce.ts` — injection key + `useAnnounce()` composable.
- `src/components/OutcomeBadge.vue` — S/U/N badge (green/amber/red) with `role="img"`.
- `src/components/StandingsRow.vue` — `<tr>` with rank, TeamLabel, form badges, stats.
- `src/components/ScoreInput.vue` — stepper `[−] score [+]` with large tap targets.
- `src/components/DisciplineInput.vue` — always-visible Gelb/Rot steppers for Heim/Gast.
- `src/components/ScoreDialog.vue` — native `<dialog>` with `showModal()`, focus trap
  via browser, Esc to close, ARIA live announcement on save, pre-fills existing result,
  Löschen button to clear.
- Updated `src/App.vue` — provides `announceKey` so dialogs can push screen-reader
  announcements via the existing `role="status"` live region.
- Updated `src/components/MatchCard.vue` — `<button>` semantics, shows score when
  result exists, aria-label describes match + action.
- Updated `src/components/GroupTable.vue` — semantic `<table>` standings, `<ScoreDialog>`
  mounted on demand (`v-if="selectedMatch"`), reactive standings via `computed`.

**Verify:** `npm run test:unit` (26 pass), `npm run typecheck` clean.

## M2 — Domain + fixture data (completed 2026-06-26)

Delivered:

- `src/types/tournament.ts` — `GroupId`, `Stage`, `Team`, `Player`, `TeamRef`
  (incl. `ThirdPlaceSlot`), `MatchSlot`, `Result`, `PersistedState`.
- `src/data/teams.ts` — all 48 teams from the final draw, German names +
  `flag-icons` codes + FIFA World Ranking (11 June 2026 snapshot). Play-off slots
  resolved to the March 2026 winners (Bosnia, Sweden, Turkey, Czechia; DR Congo,
  Iraq). Helpers `teamsById`, `teamsInGroup`.
- `src/data/fixtures-2026.ts` — 72 group matches (`M01`–`M72`, real kickoffs with
  venue UTC offsets) + 32 knockout matches (`M73`–`M104`) chained via
  `groupRank` / `thirdPlace` / `matchWinner` / `matchLoser`. Includes the full
  495-row FIFA Annex C third-place allocation table (`THIRD_PLACE_ALLOCATION`,
  `THIRD_PLACE_SLOT_HOST`).
- `tests/unit/data.spec.ts` — 20 sanity tests (counts, uniqueness, 3 matches per
  team, bracket reachability, full allocation-table validation).
- `docs/tournament-rules.md` — regulatory reference with Wikipedia/FIFA links.

Data was sourced and machine-parsed from Wikipedia raw wikitext (not transcribed
by hand) and cross-validated; see `docs/tournament-rules.md` for sources.

**Verify:** `npm run test:unit` (20 pass), `npm run typecheck`, `npm run lint` —
all clean.
