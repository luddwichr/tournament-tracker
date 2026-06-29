# Technical Review — World Cup 2026 Tracker

A critical, improvement-focused technical assessment of the app (Vue 3 + TypeScript +
Pinia PWA). Findings are grouped by topic; within each topic they are ordered by
relevance (**Critical → Major → Minor**). Positive aspects are deliberately omitted.

File references use `path:line`. A handful of cross-cutting claims were verified
directly against the source (noted inline as _verified_).

---

## 5. Test Coverage & Quality

### Critical

- **The UI layer is essentially untested.** Only `AppNav`, `ConfirmDialog`, and `StepperInput` have specs.
  14/17 components and all 4 views have none — including logic-bearing
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

- Pervasive brittle CSS-class + positional selectors in e2e (`.bracket-round').nth(1)…`)
  couple tests to layout.
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

| Module                                       | Tested?       | Notes                                                  |
| -------------------------------------------- | ------------- | ------------------------------------------------------ |
| `lib/tiebreakers.ts`                         | Indirect only | No own spec; exercised via `computeGroupStandings`     |
| `lib/standings.ts` (`computeGroupStandings`) | Yes           | played/wins/GF/GA/cards/form/ordering all covered      |
| `lib/third-place.ts`                         | Partial       | fair-play / FIFA-rank / null-allocation paths untested |
| `lib/possible-teams.ts`                      | Decent        | Memoization not actually tested; weak assertions       |
| `lib/persistence.ts`                         | Partial       | `parseImport` solid; `exportJson` untested             |
| `lib/knockout.ts`                            | Good          | Unknown-matchId branch untested                        |
| `lib/bracket-labels.ts`                      | Full          | Well parameterized                                     |
| `data/*`                                     | Strong        | `data.spec.ts` is the strongest file in the suite      |
| `stores/tournament.ts`                       | e2e only      | …which may not run                                     |
| `stores/settings.ts`                         | None          | Theme untested                                         |
| `composables/*`                              | None          | scroll-lock ref-counting & announce untested           |
| 15 components + 4 views                      | Mostly none   | Only AppNav/ConfirmDialog/StepperInput have specs      |

---

## 6. Cross-cutting & Process

- **CI gap (inferred).** No coverage threshold and no evidence the e2e suite gates merges.
  Wiring `test:unit` + `test:e2e` + `typecheck` + `lint` into CI is the highest-leverage
  process change available.
- **Recurring duplication theme.** The same anti-pattern repeats at every layer: button CSS (×3), cluster-by-criteria logic (×3), `isGroupComplete` (×2), theme tokens (×4).

---

_Review compiled from five focused passes (components, TS/logic, a11y, CSS, tests). Key
structural and breakage claims were verified directly against the source._
