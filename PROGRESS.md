# Implementation progress

Tracks milestone status against [`IMPL_PLAN.md`](./IMPL_PLAN.md). Each milestone
ends with a runnable app + green tests.

| Milestone                                  | Status         | Notes                                                      |
| ------------------------------------------ | -------------- | ---------------------------------------------------------- |
| M1 — Scaffold                              | ✅ Done        | Vite + Vue 3 + TS shell, 3 routes, tooling, smoke tests    |
| M2 — Domain + fixture data                 | ✅ Done        | Types, 48 teams, 104 fixtures, Annex C table, sanity tests |
| M3 — Group view (read-only)                | ✅ Done        | 12 group cards, flags, matches, sticky header              |
| M4 — Result entry + standings              | ✅ Done        | Pinia store, full FIFA tiebreakers, ScoreDialog, standings |
| M5 — Persistence + export/import           | ⏳ Not started |                                                            |
| M6 — Knockout deduction                    | ⏳ Not started |                                                            |
| M7 — Knockout bracket view                 | ⏳ Not started |                                                            |
| M8 — PWA                                   | ⏳ Not started |                                                            |
| M9 — Polish                                | ⏳ Not started |                                                            |
| M10 — Squad viewer                         | ⏳ Not started |                                                            |
| M11 — Possible matchups (headline feature) | ⏳ Not started |                                                            |

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
