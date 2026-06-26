# Implementation progress

Tracks milestone status against [`IMPL_PLAN.md`](./IMPL_PLAN.md). Each milestone
ends with a runnable app + green tests.

| Milestone                                  | Status         | Notes                                                      |
| ------------------------------------------ | -------------- | ---------------------------------------------------------- |
| M1 — Scaffold                              | ✅ Done        | Vite + Vue 3 + TS shell, 3 routes, tooling, smoke tests    |
| M2 — Domain + fixture data                 | ✅ Done        | Types, 48 teams, 104 fixtures, Annex C table, sanity tests |
| M3 — Group view (read-only)                | ⏳ Not started |                                                            |
| M4 — Result entry + standings              | ⏳ Not started |                                                            |
| M5 — Persistence + export/import           | ⏳ Not started |                                                            |
| M6 — Knockout deduction                    | ⏳ Not started |                                                            |
| M7 — Knockout bracket view                 | ⏳ Not started |                                                            |
| M8 — PWA                                   | ⏳ Not started |                                                            |
| M9 — Polish                                | ⏳ Not started |                                                            |
| M10 — Squad viewer                         | ⏳ Not started |                                                            |
| M11 — Possible matchups (headline feature) | ⏳ Not started |                                                            |

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
