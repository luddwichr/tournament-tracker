# CLAUDE.md

## Orientation

Offline-first PWA that tracks the FIFA World Cup 2026.
The German UI is the product, and the code and comments are English.

Only `results`, the map of entered match results, is mutable state.
Standings, the third-place ranking and the whole knockout bracket are derived by pure functions in `src/lib/`.
Fixing a wrong table almost always means fixing a function there, not a component.

Layers live in `src/` and `eslint-plugin-boundaries` enforces which may import which, configured in `eslint.config.js`.

| Folder                                         | Role                                        |
| ---------------------------------------------- | ------------------------------------------- |
| `types`, `data`, `lib`                         | Domain: types, static snapshots, pure logic |
| `components`, `views`, `stores`, `composables` | UI                                          |
| `app`                                          | Entry point and router                      |
| `build`                                        | Repo-consistency specs, not shipped         |

### Generated files, never hand-edited

`src/data/squads.ts` and `src/data/fifa-ranking.ts` are written by `scripts/fetch-squads.ts` and
`scripts/fetch-fifa-ranking.ts`.
Re-run the script instead of editing the output.

### Domain rules that are easy to get wrong

`THIRD_PLACE_ALLOCATION` in `src/data/fixtures-2026.ts` is FIFA's verbatim Annex C table.
Never recompute or "correct" it by intuition, and treat it as the source of truth.
The tiebreaker chain has its own regulation-sourced write-up in `docs/tournament-rules.md`, and 2026 applies
head-to-head **before** overall goal difference.
A level knockout score with no shootout goals means "not decided yet", not a draw.

### Running things

- One test file: `npx vitest run src/lib/standings.spec.ts`.
- The full local gate: `npm run check:code`, which is what the Stop hook and `.githooks/pre-push` both run.
- Coverage is gated, so new code with thin tests fails the gate rather than merely lowering a number.
  Thresholds live under `test.coverage.thresholds` in `vite.config.ts`.
- `npm run format` runs `oxfmt` over JS, TS, Vue, JSON, CSS and Markdown.
- `npm run dev` never returns, so do not run it in a foreground agent.
  `docs/` and the `verify` skill cover driving the app.

## Writing prose

Comments, JSDoc, Markdown docs, the README and commit messages follow a house style that no linter enforces.
Invoke the `prose-style` skill before writing or editing any of them.
