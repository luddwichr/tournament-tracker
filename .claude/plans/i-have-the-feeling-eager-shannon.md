# Refactor plan — component structure, markup/CSS, tests, lint signals

## Context

The component layer of the WC-2026 tracker has accumulated structural debt that
three exploration passes confirmed:

- **Four dialogs** (`ScoreDialog`, `SquadDialog`, `PossibleTeamsDialog`,
  `ConfirmDialog`) each independently re-implement the same `<dialog>` lifecycle
  (`showModal()` on mount, `useScrollLock`, `@close` emit) **and** ~90 lines of
  near-identical CSS (backdrop, inner shell, header, close button). This is the
  single largest source of duplicated markup/CSS in the app.
- **`TeamLabel`** mixes three responsibilities: render flag+name, own the squad
  dialog (state + Teleport), and look up squad data — a clear SRP violation.
- **`ScoreDialog` (302 L)** and **`BracketView` (272 L)** each bundle several
  concerns (form state + penalty logic + wrapper; layout + dialog + hover/SVG)
  that belong in composables.
- Some **pure logic lives in components/composables** instead of `src/lib`
  (`use-bracket-connectors` static maps; `SquadList` position sort/labels).
- **Tests** duplicate factories: `makeResult()` ×6 and `allGroupResults()` ×3 in
  unit specs; `STORAGE_KEY`/`storedState()`/seeding across e2e specs.
- **Lint** gained ESLint + `eslint-plugin-vue` (flat/recommended) in `94ed50f`,
  but has no rules that signal oversized components or enforce the conventions
  the codebase already follows by hand.

Two findings deliberately bound the scope:

- **Layout (grid vs flex) is already optimal** — the CSS agent found no
  inefficiency. Grid is used for the 2-D cases (group card grid, match-card
  `1fr auto 1fr`), flex for 1-D. **No layout rewrites.** The CSS win is
  deduplication, not re-layout.
- **Touch targets already meet 44 px (WCAG 2.5.5) everywhere.** Per decision, we
  keep the `--tap-target` baseline; no resizing work.

Outcome: smaller, single-responsibility components; markup/CSS reduced by
~150–200 lines with identical UX; logic fully in `lib`; deduplicated test
fixtures; and lint that actively flags component-design regressions. A11y stays
enforced by the existing axe-core Playwright scans (robust + tech-agnostic),
**not** a stale static plugin.

---

## Workstream A — `BaseDialog` wrapper (highest impact) ✅ DONE

`src/components/BaseDialog.vue` created: owns `<dialog>` ref, `showModal()` on
mount, `useScrollLock()`, native Esc, `@close → emit('close')`, shared shell CSS
(`::backdrop`, `__inner`, `__header`, `__close` button `aria-label="Schließen"`),
scrollable variant via `maxHeight` prop, `maxWidth` prop, `showCloseButton` prop
(default `true`, uses `withDefaults` to prevent Vue boolean-casting to `false`).
Slots: `title` (replaces h2), default (body), `footer`. Exposes `close()`.
`src/components/BaseDialog.spec.ts` added (19 tests).

All four dialogs refactored to render content only inside `BaseDialog`:

- `SquadDialog.vue` — title slot for flag+name heading; body = `<SquadList>`.
- `PossibleTeamsDialog.vue` — `title` prop; body content in styled wrapper div.
- `ConfirmDialog.vue` — `showCloseButton=false`; footer slot for cancel/confirm;
  calls `baseDialog.value?.close()` via template ref.
- `ScoreDialog.vue` — `title` prop; body + footer slots; delete btn uses
  `margin-right: auto` to stay left inside `flex-end` footer.

Net: 814 → 652 lines across the dialog layer (−162 lines). `use-scroll-lock.ts`
now called once, inside `BaseDialog`.

Also enforced zero ESLint warnings: added `--max-warnings 0` to the lint script
and turned off `vue/require-default-prop` for Vue files (TypeScript `?` handles
optionality; `withDefaults` covers the boolean-casting edge case).

## Workstream B — Decouple `TeamLabel` (full decouple) ✅ DONE

`src/components/TeamLabel.vue` becomes **presentation-only**: render flag+name;
when `clickable`, render as `<button>` that calls an **injected opener**, with no
knowledge of `SquadDialog` or the `squads` dataset.

- Add **`src/composables/use-squad-viewer.ts`**: a `provide`/`inject` pair —
  `provideSquadViewer()` (called once in `src/App.vue`) holds the open team ref +
  `open(team)`/`close()`; `useSquadViewer()` returns `open`.
- Mount **one** `<SquadDialog>` host at app root (`App.vue`) driven by that state;
  it performs the `squads[team.id]` lookup. Removes the per-use Teleport.
- `TeamLabel` (clickable) calls `useSquadViewer().open(team)` on click. Parents
  (`StandingsRow`, `RankingView`, `MatchCard`) need no change beyond keeping
  `:clickable`.

## Workstream C — Slim large components via composables ✅ DONE

- **`src/composables/use-match-result-form.ts`** — extract from `ScoreDialog` the
  six score/discipline refs, the penalty `computed`+`watch`, and `save`/`clear`
  (+ `useAnnounce`). Optionally extract **`src/components/PenaltyPicker.vue`** for
  the penalty toggle UI. `ScoreDialog` becomes `BaseDialog` + inputs + composable.
- **`src/composables/use-possible-teams-dialog.ts`** and
  **`src/composables/use-bracket-highlight.ts`** — extract from `BracketView` the
  possible-teams dialog state/derivations and the hover/highlight/connector-path
  state. `BracketView` becomes an orchestrator of `BracketRound`/`OriginColumn` +
  Teleported dialog.

## Workstream D — Move pure logic into `src/lib` ✅ DONE

`src/lib/bracket-graph.ts` created: 4 static topology maps (`nextMatchMap`,
`prevMatchMap`, `teamRefToMatchId`, `matchToRefKeys`) extracted from
`use-bracket-connectors.ts`; composable now re-exports them and keeps only
bezier geometry. `src/lib/bracket-graph.spec.ts` added (map tests moved from
composable spec). `src/lib/squad.ts` created: `POSITION_LABEL`,
`POSITION_ORDER`, `sortBySquadPosition()` extracted from `SquadList.vue`;
component `<script setup>` reduced to 3 lines.

## Workstream E — CSS consolidation & token cleanup ✅ DONE

Most dialog CSS is removed by A. Remaining, in `src/styles/base.css`:

- Add `.sticky-card-header` utility (used by `BracketRound`, `OriginColumn`).
- Add `.highlight-ring` utility for the shared
  `box-shadow: 0 0 0 2px color-mix(... primary 25% ...)` (2 sites).
- Fold the table-header tint (`color-mix(... primary 8% ...)`) into a shared rule
  (`GroupTable`, `SquadList`, `RankingView`).
- Delete `MatchCard`'s local `:focus-visible` blocks (lines ~205, ~254) — rely on
  the global rule in `base.css`.
- Fix the spacing-convention violation: `BracketRound.vue` `.bracket-round__section-label`
  `margin` → parent `gap`.
- Remove unused tokens from `src/styles/tokens.css` after a final grep:
  `--state-drag`, `--breakpoint-md`, `--breakpoint-lg`, `--elevation-2`,
  `--elevation-3`.

## Workstream F — Test infrastructure ✅ DONE

`src/test-support/results.ts` created: shared `makeResult()`,
`allGroupResults()`, `resultsMap()`; coverage `exclude` updated for
`src/test-support/**`. `e2e/support/results.ts` created: shared `STORAGE_KEY`,
`makeResult()`, `storedState()`, `seedResults()`, `allGroupResults()`. All 6
lib specs (`standings`, `knockout`, `third-place`, `tiebreakers`,
`possible-teams`, `persistence`) and 3 e2e specs (`knockout`, `possible-teams`,
`export-import`) updated to import from the shared factories, removing ~340
lines of duplicated helper code.

Remaining F items (not yet done):

- Reduce brittle bracket navigation: select by the existing `data-match-id`
  attribute (add stable `data-testid`s where missing) instead of
  `.bracket-round nth(...).match-card nth(...)`.
- **A11y stays in axe-core Playwright** (the chosen tech-agnostic solution).
  Audit the existing 15 scans for coverage gaps and add any missing open-dialog
  state (e.g. an open `ScoreDialog` scan). Do **not** add a static a11y lint
  plugin.

## Workstream G — Lint signals for component design ✅ DONE

Extend **`eslint.config.js`** (no new a11y plugin):

- `vue/max-lines-per-block` — cap `script`/`template`/`style` blocks (e.g.
  script 150, template 120, style 220) to actively flag the “split at ~150 lines”
  convention. Tune thresholds so the post-refactor tree passes.
- `vue/component-api-style: ['error', ['script-setup']]` — enforce `<script setup>`.
- `vue/block-order`, `vue/define-macros-order`, `vue/define-emits-declaration`,
  `vue/define-props-declaration`, `vue/no-unused-refs` — consistency/dead-code.
- Note the rationale (and the deliberate “a11y via axe, not static plugin”
  decision) in `docs/accessibility.md` / a short `docs/linting.md`.

---

## Suggested sequencing (independent, reviewable steps)

1. ✅ **D** (lib extraction) + **F** (test fixtures) — pure, low-risk, unblocks
   confident refactoring.
2. ✅ **A** (`BaseDialog`) — biggest structural + CSS win.
3. ✅ **B** (`TeamLabel` decouple) — depends on A’s single SquadDialog host.
4. ✅ **C** (composable extraction for `ScoreDialog`/`BracketView`).
5. ✅ **E** (CSS utilities + token cleanup) — easiest once dialogs are consolidated.
6. ✅ **G** (lint rules) — last, with thresholds tuned to the refactored tree.

## Critical files

- New: `src/components/BaseDialog.vue`, `src/components/PenaltyPicker.vue`,
  `src/composables/use-squad-viewer.ts`, `use-match-result-form.ts`,
  `use-possible-teams-dialog.ts`, `use-bracket-highlight.ts`,
  `src/lib/bracket-graph.ts`, `src/lib/squad.ts`, `src/test-support/results.ts`,
  `e2e/support/results.ts`.
- Changed: the 4 dialog components, `TeamLabel.vue`, `BracketView.vue`,
  `SquadList.vue`, `use-bracket-connectors.ts`, `App.vue`, `base.css`,
  `tokens.css`, `BracketRound.vue`, `MatchCard.vue`, `eslint.config.js`, the 6
  lib specs + 3 e2e specs.

## Verification

- `npm run typecheck` clean.
- `npm run lint` (eslint + oxlint) clean — including the new component-design
  rules.
- `npm run test:unit` green with coverage thresholds (70/70/60/70) still met;
  new specs for `lib/bracket-graph.ts` and `lib/squad.ts`.
- `npm run test:e2e` green, **all axe-core scans pass** (a11y gate).
- `npm run build && npm run test:e2e:pwa` — offline PWA still works.
- Manual walkthrough at 360 px and desktop: open/close every dialog (Esc + ✕),
  enter a result, open a squad from standings/ranking/match card, exercise the
  knockout possible-teams dialog + hover highlights — UX unchanged.
