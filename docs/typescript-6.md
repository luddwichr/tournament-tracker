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

- Strict mode comes from `@vue/tsconfig` (`0.9.1`), extended by
  `tsconfig.app.json` (DOM) and `tsconfig.node.json` (Node tooling).
- Root `tsconfig.json` is a solution file (`files: []` + project references);
  `vue-tsc -b` build mode drives type-checking across both projects.
- Extra strictness enabled: `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch`.
- Type-check the whole project with `npm run typecheck` (`vue-tsc -b --noEmit`).
