# TypeScript

**Pinned version: `6.0.3`** (exact, no caret). Verified latest 6.x at scaffold
time (2026-06-26).

## Notable changes vs. TypeScript 5.x affecting this codebase

- **`baseUrl` is deprecated.** TS 6 emits a deprecation error for `baseUrl` and
  it is scheduled for removal in TS 7. Path mapping no longer requires it: in
  `tsconfig.app.json` we set `paths` (`"@/*": ["./src/*"]`) **without**
  `baseUrl`; paths are resolved relative to the `tsconfig.json` that declares
  them. (Hit during scaffold — the editor flagged
  `Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0`.)
- If a deprecated option is genuinely needed, TS 6 accepts
  `"ignoreDeprecations": "6.0"` to silence the error — we did **not** need it.

## Project config

Layout (three leaf projects + a shared base + a solution root):

- `tsconfig.base.json` — strict options **shared** by every project, pulled in via
  each leaf's `extends`.
- `tsconfig.app.json` (DOM) and `tsconfig.vitest.json` (tests, extends app) and
  `tsconfig.node.json` (Node tooling) — each does
  `"extends": ["@vue/tsconfig/...", "./tsconfig.base.json"]` (array form, TS 5.0+;
  later entries win) plus its own env-specific bits (`lib`, `types`, `module`).
- Root `tsconfig.json` is a **solution file** (`files: []` + project references);
  `vue-tsc -b` build mode type-checks all three projects.

**Gotcha that drove this layout:** a solution file's `compilerOptions` are **not**
inherited by referenced projects — `extends` propagates compilerOptions, project
`references` do not. So shared options must live in a base that each leaf
`extends`, not in the root `tsconfig.json`. (Verify what a project actually sees
with `npx tsc -p tsconfig.app.json --showConfig`.)

- Base mode/strictness from `@vue/tsconfig` (`0.9.1`): `strict`,
  `verbatimModuleSyntax`, `allowImportingTsExtensions`, `noEmit`, etc.
- Extra strictness in `tsconfig.base.json`: `noUnusedLocals`,
  `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`,
  `noImplicitReturns`, `noPropertyAccessFromIndexSignature`, `noImplicitOverride`,
  `exactOptionalPropertyTypes`, `erasableSyntaxOnly`.
- Type-check the whole project with `npm run typecheck` (`vue-tsc -b --noEmit`).

## ECMAScript target & lib

We pin `target` **and** `lib` to a concrete latest year, **`ES2025`**, rather
than the floating `ESNext` that `@vue/tsconfig` defaults to:

- `tsconfig.app.json`: `target: "ES2025"`, `lib: ["ES2025", "DOM", "DOM.Iterable"]`.
- `tsconfig.node.json`: `target: "ES2025"`, `lib: ["ES2025"]` (no DOM — these are
  Node-run config files like `vite.config.ts`).
- `tsconfig.vitest.json` inherits the app config's `lib` (tests run in Node, which
  has every ES2025 built-in).
- Kept in sync with Vite's `build.target: 'es2025'` (see `docs/vite-pwa.md`).

**Why a pinned year, not `ESNext`:** `ESNext` _floats_ with each TypeScript
release, so the set of "available" built-ins silently grows as you upgrade — and
`lib` advertises **runtime APIs, not syntax**. Neither Rolldown nor any bundler
polyfills built-in _methods_, so `lib: ESNext` lets you call something that
typechecks clean but throws (e.g. `x.union is not a function`) in any browser
that doesn't ship it yet. Pinning to `ES2025` makes the available API surface
deterministic across toolchain upgrades. The deployment baseline is therefore
"browsers that ship ES2025 built-ins" — fine for an evergreen-only 2026 PWA.

This is why `Array#toSorted` (ES2023) typechecks: it's part of the `ES2025` lib.
TS 6.0.3 ships the `lib.es2025.*.d.ts` definitions.
