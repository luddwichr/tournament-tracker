# Implementation progress

Tracks milestone status against [`IMPL_PLAN.md`](./IMPL_PLAN.md). Each milestone
ends with a runnable app + green tests.

| Milestone                                  | Status         | Notes                                                      |
| ------------------------------------------ | -------------- | ---------------------------------------------------------- |
| M1 — Scaffold                              | ✅ Done        | Vite + Vue 3 + TS shell, 3 routes, tooling, smoke tests    |
| M2 — Domain + fixture data                 | ✅ Done        | Types, 48 teams, 104 fixtures, Annex C table, sanity tests |
| M3 — Group view (read-only)                | ✅ Done        | 12 group cards, flags, matches, sticky header              |
| M4 — Result entry + standings              | ✅ Done        | Pinia store, full FIFA tiebreakers, ScoreDialog, standings |
| M5 — Persistence + export/import           | ✅ Done        | localStorage persist, JSON export/import, SettingsView     |
| M6 — Knockout deduction                    | ✅ Done        | third-place ranking, resolveTeamRef, canEnterResult, tests |
| M7 — Knockout bracket view                 | ⏳ Not started |                                                            |
| M8 — PWA                                   | ⏳ Not started |                                                            |
| M9 — Polish                                | ⏳ Not started |                                                            |
| M10 — Squad viewer                         | ⏳ Not started |                                                            |
| M11 — Possible matchups (headline feature) | ⏳ Not started |                                                            |

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
