# Technical Review — WM 2026 Tracker

Reviewed: full source (`src/`, `e2e/`, configs, hooks, CI, docs) as of `62638e1`.
Objective baseline: `lint` and `typecheck` clean; 550 unit tests in 56 files, all passing;
coverage 93.8 % statements / 89.8 % branches / 94.7 % lines.

Severity legend: 🔴 critical/high · 🟡 medium · 🟢 low/nit

All findings from §1 "Top priorities" and §2 "TypeScript & domain logic" in the
previous version of this review have been addressed: the `possible-teams` enumeration
is now clamped to a fixed combinatorial budget; REQUIREMENTS.md was corrected to match
the (correct) implementation; penalty shootouts are modeled as a real score plus a
`shootoutWinner` field instead of a fabricated goal; localStorage rehydration is
validated via an `afterHydrate` hook; `parseImport` rejects arrays and validates fixture
ids/`matchId` correspondence; `TeamId`, `ResultsMap`, a discriminated `MatchSlot`
(`GroupMatchSlot`/`KnockoutMatchSlot`), and `readonly` domain fields close the
type-level gaps; the Annex-C plumbing in `third-place.ts` is deduplicated; the smaller
logic/API nits (ESPN card-attribution guard, error causes, `now` injection, dead
`onProgress`, cache eviction/coupling, `fixturesById`, precomputed group-match maps, the
dead `squad.ts` position guard, stringly match-number parsing) are fixed; and the squad
name suffixes plus the fifa-ranking/teams name-drift guard are in place.

---

## 1. How to improve: established techniques & feedback loops (especially for coding agents)

The recurring failure mode in this codebase is not bad code — it's **drift**: comments,
docs, and configs that describe a state the code has left (`main.ts` bundle comment,
REQUIREMENTS.md tiebreakers, dead coverage thresholds, disabled pre-push hook,
squad-name suffixes). Drift is exactly what mechanical feedback loops catch and
humans/agents don't. Concrete program, in order of leverage:

1. **One `npm run check` as the single contract** — `typecheck && format:check && lint
&& test:unit:coverage`, called by CI, by pre-push, and by any coding agent before it
   declares work done. A single command that must pass is the highest-value feedback
   loop for agent workflows: it removes "which checks exist?" as a failure point, and
   CLAUDE.md should say exactly that ("run `npm run check` before committing; a task is
   not complete while it fails").
2. **Turn conventions into lint rules; delete them from prose.** Every rule that lives
   only in CLAUDE.md or a reviewer's head will be violated by the next agent session.
   Candidates from this review: `vuejs-accessibility` plugin, `oxlint
--deny-warnings`, import ordering. A custom-property-must-exist check now exists as
   a Vitest spec (`src/styles/tokens.spec.ts`) rather than a stylelint rule — cheaper to
   land given the codebase has no stylelint setup yet, worth revisiting if more CSS
   lint needs pile up. The house `toSorted()` rule shows the team already knows this
   works — extend the pattern.
3. **Encode invariants as types or data-integrity tests, never as comments.**
   `TeamId`-keyed squads now turn a typo'd squad key into a compile error, and
   `data.spec.ts`/`squads.spec.ts`/`fifa-ranking.spec.ts` grew the missing guards (no
   `(` in player names, ranking↔teams name equality); `storage-key single-sourcing` was
   already fine (`STORAGE_KEY` has one definition, imported everywhere). Comments that
   stated an invariant ("callers must not mutate") are now `readonly` fields instead.
4. **Keep executable docs, kill aspirational ones.** REQUIREMENTS.md's tiebreaker section
   used to actively endanger the code it describes — now corrected and cross-linked to
   `tournament-rules.md` instead of duplicating it. Rule of thumb going forward: a doc
   may describe _intent_ (`tournament-rules.md` does this well, with tests referencing
   it) but must not _duplicate_ what code/tests already state — link instead. A README
   documenting the feedback loops themselves (scripts, hooks, CI, deploy base path) is
   still missing — that's the doc agents read first.
5. **Give agents a runnable ground truth for the UI.** The gaps axe can't see (keyboard
   tab traps, inert live regions) were the worst a11y findings — both are now fixed, and
   the axe scans (ScoreDialog, dark theme, /ranking) have been added. Still missing: one
   keyboard-only e2e journey and one mobile-viewport Playwright project. For agent
   sessions, `npm run dev` + playwright-cli screenshots is the strongest "did it actually
   work" loop — cheaper than reasoning about CSS in the abstract.
6. **Close the loop on generated data.** `squads.ts` shipped `(soccer)` suffixes because
   the generator's output was trusted blind — `fetch-squads.py` is now fixed and
   `squads.spec.ts` guards against the suffix regressing. Every generator script should
   have a validation step in the same run so regeneration can't ship garbage again.
