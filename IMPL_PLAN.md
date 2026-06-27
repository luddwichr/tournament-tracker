# World Cup 2026 — Offline PWA · Implementation Plan

## Context

Greenfield project (only `.git` present). Goal: an offline-first web app that

1. Displays the full WC 2026 schedule (48 teams, 12 groups, 104 matches).
2. Lets the user enter actual match results.
3. Automatically computes group standings (FIFA tiebreakers) and propagates winners through the knockout bracket — including the 8 best 3rd-placed teams in the 48-team format.
4. **(Headline extra feature, post-basics)** For each upcoming knockout slot still unresolved, a dedicated button reveals the _set of teams that could still fill that slot_ given current results.

Today is 2026-06-26 — the tournament started 2026-06-11, so the app must support back-filling already-played matches as soon as it ships.

### Locked-in decisions

| Decision            | Choice                                                            |
| ------------------- | ----------------------------------------------------------------- |
| Scope               | Result tracker only (no predictions/tipping)                      |
| Stack               | Vue 3 + Vite + TypeScript 6 (latest exact pin)                    |
| State               | Pinia + auto-persist to `localStorage`; manual JSON export/import |
| Deployment          | PWA (installable, offline-first)                                  |
| UI language         | **German** (UI strings only)                                      |
| Code language       | **English** (filenames, components, identifiers, comments)        |
| Dependency versions | **Exact pinned** in `package.json` — no `^`/`~`                   |
| Match metadata      | Date/time + stage only (no venues)                                |
| Knockout            | Fully automatic from group standings — no manual override         |
| Fixtures            | Hardcoded TypeScript module in repo                               |
| Flags               | `flag-icons` (lipis) npm package                                  |
| Tests               | Playwright (e2e) + Vitest (unit)                                  |

---

## Tech stack (pin exact latest at scaffold time)

The scaffolding agent **must** check the actual latest version of each dependency at install time (via `npm view <pkg> version` or the project's release page) and pin exact versions — do not assume training-data knowledge.

- **Vue 3** (latest 3.x) with `<script setup>` Composition API
- **Vite** (latest)
- **TypeScript 6** (latest 6.x — confirm at https://github.com/Microsoft/TypeScript/releases)
- **Pinia** + **`pinia-plugin-persistedstate`**
- **Vue Router** — 3 routes: `/groups`, `/knockout`, `/settings`
- **`vite-plugin-pwa`** for service worker + manifest
- **`flag-icons`** (by lipis) — supports GB constituent nations (`gb-eng`, `gb-sct`, `gb-wls`)
- **Vitest** + **`@vue/test-utils`**
- **`@playwright/test`**
- **oxlint** (`typescript` + `oxc` + `vue` plugins) + **oxfmt**
- No UI framework — plain CSS (custom-property design tokens)

### Version documentation discipline

Maintain `docs/` at repo root with one markdown file per significant dependency (`docs/typescript-6.md`, `docs/vue.md`, `docs/vite-pwa.md`, …). For each:

- Exact pinned version.
- Notable changes vs. older widely-known versions that affect _this_ codebase (sourced from release notes / web search at the time of pinning).
- Migration gotchas an implementing agent hit (so the next agent doesn't repeat them).

These files are the project's living "things-the-LLM-might-not-have-known-during-training" notebook. Update whenever a dep is added or upgraded.

---

## Frontend practices (apply throughout — these are not a separate milestone)

### Component design

- **Small, focused** components with a single responsibility. If a `.vue` file passes ~150 lines or holds two distinct concerns, split it.
- **Logic stays out of components.** Anything algorithmic — standings, tiebreakers, knockout resolution, possible-team enumeration — lives in `src/lib/` as pure functions, unit-tested in isolation. Components orchestrate and present.
- Prefer **composition + events** over prop-drilling. Use Pinia for app-wide state, `provide`/`inject` only when a subtree clearly needs shared local state.
- **Spacing rule:** _components only set padding; margin is the parent's job._ This keeps components reusable without owning their surrounding whitespace. Enforce via code review and a brief note in `docs/styling.md`.

### Layout

- **Mobile-first.** Design at 360 px width first; add breakpoints upward via `min-width` media queries.
- **CSS Grid** for high-level layouts (12 group cards, the knockout bracket). **Flexbox** for 1D arrangements (rows within a match card, button bars). No floats, no absolute-positioning hacks.
- Tap targets ≥ 44 × 44 px (WCAG 2.5.5).

### Accessibility (a11y)

- **Semantic HTML** first: `<nav>`, `<main>`, `<table>` for group standings, `<button>` for actions (never clickable `<div>`s), `<dialog>` for modals.
- **Visible focus ring** on every interactive element. Manage focus on route change and after modal open/close.
- **Color contrast** WCAG AA minimum (4.5:1 body text, 3:1 large/UI). Never convey state by color alone — pair with icons/labels (e.g. win/draw/loss shown with both color _and_ a glyph).
- **Form labels** properly associated (`<label for>` or wrapping).
- **ARIA live region** announces score updates and dialog open/close.
- **`prefers-reduced-motion`** honored — disable bracket transitions for users who opt out.
- **Keyboard support** end-to-end: Tab order, Enter/Space to activate, Esc to close dialogs.
- Enforce a11y via the **`@axe-core/playwright`** e2e scan in CI (oxlint has no
  static Vue-template a11y rules).

### Designed for age-6 readers

(The user wants this usable by reading-starters — visual recognition > literacy.)

- **Big flags everywhere.** Flag is primary identifier; team name is secondary.
- **Large numerals** for scores (≥ 32 px on mobile).
- **Universally recognized iconography** (trophy = winner, lock = unresolved, calendar = upcoming). Pair every icon with a short German label so screen readers + adults both still get it.
- **Color-coded outcomes:** W = green, D = amber, L = red — always paired with an icon or letter (a11y + colorblind safety).
- **Plain German vocabulary**, short sentences, no abbreviations beyond standard ones (_Tor_, _Spiel_, _Gruppe_, _Sieger_, _K.-o.-Runde_).
- **Generous spacing**, large fonts (base ≥ 18 px on mobile), readable line-height.

### Styling foundations

- **Modern CSS reset.** Use Andy Bell's "A (more) modern CSS reset" as the single base in `src/styles/reset.css`. Document in `docs/styling.md`.
- **Design tokens** as CSS custom properties in `src/styles/tokens.css`:
  - Colors: `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-primary`, `--color-win`, `--color-draw`, `--color-loss`, `--color-focus`
  - Spacing scale: `--space-1` … `--space-8` (4 px → 64 px geometric)
  - Radii, shadows, font sizes — same pattern
  - Dark mode via `@media (prefers-color-scheme: dark)` overriding the token values (optional but cheap once tokens exist)
- **No global utility framework** — keep CSS local to components (scoped or modules), pulling from tokens.

---

## Domain model (`src/types/tournament.ts`)

```ts
type GroupId = 'A' | 'B' | ... | 'L';                  // 12 groups
type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final';

interface Team {
  id: string;
  name: string;                 // German display name
  flagCode: string;             // flag-icons CSS code, e.g. 'de', 'gb-eng'
  fifaRanking: number;          // FIFA World Ranking position; deterministic last-resort tiebreaker
}
interface Player { number: number; name: string; position?: 'GK' | 'DF' | 'MF' | 'FW'; }
interface MatchSlot {
  id: string;                   // stable id e.g. "M01", "R32-1"
  stage: Stage;
  group?: GroupId;              // group stage only
  kickoff: string;              // ISO 8601
  homeRef: TeamRef;
  awayRef: TeamRef;
}
type TeamRef =
  | { kind: 'team'; teamId: string }
  | { kind: 'groupRank'; group: GroupId; rank: 1 | 2 }
  | { kind: 'thirdPlace'; slot: 1..8 }                        // "3rd from group X" — resolved by FIFA lookup
  | { kind: 'matchWinner'; matchId: string }
  | { kind: 'matchLoser'; matchId: string };                   // only for 3rd-place playoff
interface Result {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  // Used for the FIFA fair-play tiebreaker. See docs/tiebreakers.md for the simplified rule.
  homeYellow: number;
  homeRed: number;             // includes second-yellow send-offs
  awayYellow: number;
  awayRed: number;
}
```

Persisted state: `Record<matchId, Result>` (plus a schema version). Everything else is derived. Squads live in `src/data/squads.ts` as `Record<teamId, Player[]>` and are read-only static data.

---

## File layout (English identifiers; UI strings German)

```
worldcup-2026/
├── index.html
├── package.json                # exact pinned versions
├── vite.config.ts              # Vite + PWA + Vitest config
├── playwright.config.ts
├── tsconfig.json               # strict
├── .oxlintrc.json              # oxlint config
├── .oxfmtrc.json               # oxfmt config
├── IMPL_PLAN.md                # this file
├── docs/                       # see "Version documentation discipline"
│   ├── styling.md              # CSS architecture + spacing rule + design tokens
│   ├── accessibility.md        # a11y checklist + test approach
│   ├── tiebreakers.md          # FIFA group tiebreaker chain incl. simplified fair-play rule
│   ├── typescript-6.md
│   ├── vue.md
│   └── ...
├── public/
│   └── icons/                  # PWA icons (192, 512, maskable)
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router.ts
│   ├── styles/
│   │   ├── reset.css           # Andy Bell modern reset
│   │   └── tokens.css          # design tokens (colors, spacing, etc.)
│   ├── data/
│   │   ├── teams.ts            # 48 teams: German names + flag-icons codes + FIFA ranking
│   │   ├── squads.ts           # 48 × 26 players (number, name, position)
│   │   └── fixtures-2026.ts    # 104 MatchSlots + R32 bracket + 3rd-place lookup
│   ├── types/tournament.ts
│   ├── stores/
│   │   └── tournament.ts       # Pinia: results map; actions enterResult/clearResult/reset/export/import
│   ├── lib/                    # ALL business logic — pure, unit-tested
│   │   ├── standings.ts
│   │   ├── tiebreakers.ts
│   │   ├── third-place.ts
│   │   ├── knockout.ts
│   │   ├── possible-teams.ts   # M11
│   │   └── persistence.ts      # JSON export/import + schema validation + reset
│   ├── components/             # small, focused; presentation only
│   │   ├── AppHeader.vue
│   │   ├── AppNav.vue
│   │   ├── GroupTable.vue
│   │   ├── StandingsRow.vue
│   │   ├── MatchCard.vue
│   │   ├── ScoreInput.vue           # goals
│   │   ├── DisciplineInput.vue      # optional yellow/red counts (collapsed by default)
│   │   ├── ScoreDialog.vue          # wraps ScoreInput + DisciplineInput
│   │   ├── TeamFlag.vue             # wraps flag-icons CSS
│   │   ├── TeamLabel.vue            # flag + name (clickable → opens SquadDialog)
│   │   ├── SquadDialog.vue          # M10: shows team's 26-player squad
│   │   ├── SquadList.vue            # M10: number + name + position rows
│   │   ├── BracketView.vue
│   │   ├── BracketRound.vue
│   │   ├── PossibleTeamsButton.vue  # M11
│   │   ├── PossibleTeamsDialog.vue  # M11
│   │   └── OutcomeBadge.vue         # W/D/L badge w/ color + glyph
│   └── views/
│       ├── GroupsView.vue
│       ├── KnockoutView.vue
│       └── SettingsView.vue    # export, import, reset
├── tests/
│   ├── unit/                   # Vitest
│   │   ├── tiebreakers.spec.ts
│   │   ├── third-place.spec.ts
│   │   ├── knockout.spec.ts
│   │   ├── standings.spec.ts
│   │   └── possible-teams.spec.ts
│   └── e2e/                    # Playwright
│       ├── enter-results.spec.ts
│       ├── bracket-propagation.spec.ts
│       ├── export-import.spec.ts
│       ├── a11y.spec.ts        # axe-core scan of each route
│       └── pwa-offline.spec.ts
```

---

## Incremental milestones

Each milestone ends with a runnable app + green tests. A coding agent can pick up at any milestone boundary.

### M1 — Scaffold

- `npm create vite@latest` → Vue + TS template; immediately re-pin every version to latest exact
- Install Pinia, `pinia-plugin-persistedstate`, Vue Router, Vitest, `@vue/test-utils`, `@playwright/test`, `@axe-core/playwright`, `oxlint` + `oxfmt`, `vite-plugin-pwa`, `flag-icons`
- `tsconfig.json` strict; path alias `@/* → src/*`
- Create `docs/` with starter `styling.md`, `accessibility.md`, plus version-note files for the major deps
- Drop in `src/styles/reset.css` and `src/styles/tokens.css`
- App shell with `<AppHeader>` + `<AppNav>` + `<RouterView>`; 3 empty views; German nav labels (_Gruppen_, _K.-o.-Runde_, _Einstellungen_), English routes (`/groups`, `/knockout`, `/settings`)
- Playwright smoke spec loads `/` and runs axe-core (must pass)
- **Verify:** `npm run dev` shows shell; `npm run test:unit`, `npm run test:e2e`, `npm run lint` all clean

### M2 — Domain + fixture data

- Implement `src/types/tournament.ts`
- Author `src/data/teams.ts` — 48 qualified teams (German names + `flag-icons` codes + **FIFA World Ranking** position, with snapshot-date comment)
- Author `src/data/fixtures-2026.ts` — all 104 `MatchSlot`s:
  - 72 group matches (kickoff, group, home/away `teamId`)
  - 16 R32, 8 R16, 4 QF, 2 SF, 1 third-place playoff, 1 final — chained via `groupRank` / `thirdPlace` / `matchWinner` / `matchLoser`
  - **FIFA 3rd-place lookup table** verbatim, with a source-link comment
- Sanity-check unit tests: 104 unique ids; each team plays 3 group matches; every knockout slot reachable; every team has a FIFA ranking
- **Verify:** `npm run test:unit` green

### M3 — Group view (read-only)

- `GroupsView.vue` renders 12 `<GroupTable>`s in a responsive CSS Grid (1 col mobile → 2 → 3 → 4)
- `<GroupTable>` lists teams (alphabetical) via `<TeamLabel>` + 6 matches via `<MatchCard>` (kickoff + teams, no score input yet)
- Big flags, large numerals, plain German labels
- **Verify:** dev server walk-through at 360 px and desktop; Playwright "all 12 groups visible, all teams present"; axe-core clean

### M4 — Result entry + standings (with full FIFA tiebreakers)

- Pinia `tournament.ts` store: `results: Record<string, Result>`; actions `enterResult`, `clearResult`
- `<MatchCard>` click opens `<ScoreDialog>` (semantic `<dialog>`, focus trap, Esc to close):
  - `<ScoreInput>`: two number inputs for goals (labeled, non-negative integers)
  - `<DisciplineInput>`: collapsed section _„Karten (optional)"_ with four inputs (Gelb/Rot × Heim/Gast), all defaulting to 0
- `lib/standings.ts` + `lib/tiebreakers.ts` implement the full FIFA group tiebreaker chain:
  1. Points
  2. GD (all matches)
  3. Goals scored (all matches)
  4. H2H points (subgroup of still-tied)
  5. H2H GD
  6. H2H goals
  7. **Fair-play points** (simplified rule, documented in `docs/tiebreakers.md`): `score = −1·yellow − 3·red` summed across all group matches; higher (less negative) is better
  8. **FIFA World Ranking** (from `Team.fifaRanking`) — deterministic final tiebreaker; explicitly replaces FIFA's drawing-of-lots step
- When H2H collapses N tied teams into a smaller still-tied subset, re-run the full chain on that subset (test explicitly)
- Because step 8 is deterministic, the tiebreaker chain _always_ resolves — no unresolved-tie banner needed
- `<StandingsRow>` shows `<TeamLabel>` + P, W, D, L, GF, GA, GD, Pts with `<OutcomeBadge>`s for recent form
- ARIA live region announces "Ergebnis gespeichert: …"
- **Verify:** Vitest tiebreakers cover: GD, H2H decides, 3-way collapse, fair-play decides, world-ranking decides; Playwright: enter results → standings update; axe clean

### M5 — Persistence + export/import

- `pinia-plugin-persistedstate` for results map (localStorage key `wc2026:results:v1` — versioned)
- `lib/persistence.ts`:
  - `exportJson()` → downloads `wc2026-results-YYYY-MM-DD.json` (`{ version, results }`)
  - `importJson(file)` → parse, validate, confirm-replace
  - `reset()` → confirm, clear
- `SettingsView.vue`: _Exportieren_, _Importieren_, _Zurücksetzen_ buttons
- **Verify:** e2e enter → reload → present; export → reset → import → restored

### M6 — Knockout deduction

- `lib/third-place.ts`: rank 12 third-placed teams via tiebreakers; top 8 → R32 slots via lookup table (M2). Return `null` for ranks that can't be resolved (UI keeps working)
- `lib/knockout.ts`: `resolveTeamRef(ref, state) → Team | null` walks `groupRank` → `thirdPlace` → `matchWinner` / `matchLoser`
- Block result entry on a knockout match while either ref is unresolved
- **Verify:** Vitest (12 third-placed ranked, full R32→final propagation, blocked entry when upstream unresolved)

### M7 — Knockout bracket view

- `KnockoutView.vue` → `<BracketView>` → `<BracketRound>` × 5 (R32, R16, QF, SF, Final + 3rd-place adjacent)
- CSS Grid for round columns; horizontal scroll on narrow screens with sticky round headers
- Each slot = `<MatchCard>`; unresolved slots show placeholders (_„Sieger Gruppe A"_, _„3. der Gruppe …"_)
- **Verify:** e2e — enter all group results → R32 populated → cascade through final; axe clean

### M8 — PWA

- `vite-plugin-pwa` `registerType: 'autoUpdate'`, German manifest (`name`: _WM 2026 Tracker_, `lang: 'de'`, theme color from `tokens.css`), icons in `public/icons/`
- Workbox precaches built shell + fixtures
- **Verify:** `npm run build && npm run preview` → install prompt in Chrome; Playwright `--offline` context → app loads + works offline

### M9 — Polish

- Match status badges (_geplant_ / _läuft_ / _beendet_) from kickoff vs `Date.now()` + presence of result
- Edit existing results (re-open `<ScoreDialog>`, prefilled)
- Empty/error states (malformed JSON, etc.)
- Lighthouse PWA audit ≥ 90; Lighthouse a11y audit ≥ 95
- Verify `prefers-reduced-motion` and `prefers-color-scheme: dark`

### M10 — Squad viewer

Static, read-only display of each team's 26-player roster.

- Author `src/data/squads.ts`: `Record<teamId, Player[]>` — 48 teams × 26 players
- `<TeamLabel>` becomes interactively clickable (button semantics, focusable, Enter/Space) → opens `<SquadDialog>`
- `<SquadDialog>` uses semantic `<dialog>`; shows team flag + name in heading, then `<SquadList>` (table of number / name / position)
- Plain German position labels (_Torwart / Abwehr / Mittelfeld / Sturm_)
- **Verify:** Vitest: every team in `teams.ts` has a non-empty squad entry; Playwright: click a team flag → dialog opens → Esc closes; axe clean

### M11 — Possible matchups (headline extra feature)

On each unresolved knockout slot, a _„Mögliche Teams anzeigen"_ button (`<PossibleTeamsButton>`) opens `<PossibleTeamsDialog>` listing teams that could still fill that slot.

- `lib/possible-teams.ts`:
  - `possibleTeamsFor(ref, state) → Set<Team>`
  - `groupRank`: for each team T in the group, exists a set of outcomes for remaining group matches such that T finishes at that rank? Pragmatic enumeration: for each remaining match iterate plausible scores (e.g. `0..6` per side); compute standings each combo; collect achievable ranks per team. With ≤3 remaining matches × ≤49 score variants ≈ ~120k combos worst case — fast on demand. **Memoize per (group, remaining-result-fingerprint).**
  - `thirdPlace`: combine plausible group outcomes → plausible 3rd-place rankings.
  - `matchWinner` / `matchLoser`: recurse upstream, union possible winners/losers.
- Cache invalidated on any `Result` change. If perf complaints arise, move to a Web Worker.
- **Verify:** Vitest with constructed scenarios (1 match left in Group A → exactly 2 teams reachable for rank 1; multiple unfinished groups for a `thirdPlace` slot)
- **Acceptance e2e:** click button on a half-played R32 slot → modal lists the still-possible teams

---

## Critical correctness points

1. **3rd-place lookup table** is _the_ source of truth — encode verbatim with a comment linking the FIFA source. Community implementations of past tournaments often get this wrong.
2. **Tiebreaker subgroup logic**: H2H tiebreakers apply _only to matches between still-tied teams_; if H2H collapses N tied teams into a smaller subset, re-run the full chain on that subset.
3. **Versioned localStorage key** (`wc2026:results:v1`): schema bump → migration in `persistence.ts`.
4. **Unresolved ties never block the UI** — show banner, let user continue elsewhere.
5. **Pinned versions**: a dep upgrade that changes behavior must be documented under `docs/<dep>.md` _before_ the code change lands.
6. **M11 enumeration bounds**: memoization is mandatory; main thread first, Web Worker only if needed.

---

## End-to-end verification (after M9; M10 + M11 verified separately)

1. `npm install && npm run dev` → app loads in German with English routes
2. Enter all 72 group results (e2e fixture set)
3. R32 matchups appear correctly, including the 8 best 3rd-placed teams
4. Propagate winners through R16 → QF → SF → 3rd place → Final
5. _Exportieren_ → JSON downloads with full state
6. _Zurücksetzen_ → empty state restored
7. _Importieren_ selecting the exported file → state fully restored
8. `npm run build && npm run preview` → install as PWA, go offline → fully functional
9. `npm run test:unit` and `npm run test:e2e` (incl. axe-core a11y spec) → all green; `npm run lint` clean

---

## Out of scope (explicit)

- Predictions / tipping scoring
- Multi-user / multi-device sync
- Cloud backup
- Stadium / venue / referee data
- Live score auto-fetch
- UI languages other than German
- Manual override of deduced knockout matchups
