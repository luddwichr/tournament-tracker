# TypeScript 6 + 7 side-by-side setup

This project type-checks with **both** compilers side by side, following the setup from the
[TypeScript 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0):
TypeScript 7 (`tsc`) checks the Vue-free projects, and TypeScript 6 (via vue-tsc) checks
everything that touches a `.vue` SFC. This file documents why, what the workarounds are, and when
they can be removed.

## Which compiler checks what

`npm run typecheck` runs both halves in parallel (`typecheck:vue` + `typecheck:ts7`):

| Project                                     | Compiler       | Why                                                             |
| ------------------------------------------- | -------------- | --------------------------------------------------------------- |
| `tsconfig.app.json`, `tsconfig.vitest.json` | vue-tsc (TS 6) | contain / import `.vue` SFCs — only vue-tsc understands them    |
| `tsconfig.node.json`, `tsconfig.e2e.json`   | `tsc` (TS 7)   | Vue-free (build config, Playwright e2e) — TS 7 checks them fast |

The two compilers have opposite
blind spots: vue-tsc must load every `.ts` a `.vue` imports (so the app layer can't be handed to
`tsc`), and `tsc` cannot parse a `.vue` at all (so any project whose import graph reaches an SFC —
even transitively, e.g. `router.ts` → view SFCs — must stay on vue-tsc). The two TS 7 projects earn
their place by importing **only** the pure-TS domain layer (`src/data`, `src/types`, `src/lib`);
`tsconfig.e2e.json`'s `include` is deliberately narrowed to keep it that way.

## Why

TypeScript 7 has no programmatic (JS) API yet — `require("typescript")` on
`typescript@7` exposes nothing but `version`. Two of our dev tools need that
API and are therefore stuck on TypeScript 6 for now:

| Tool                | Problem                                                                                                              | Tracking issue                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `typescript-eslint` | Peer dependency `typescript@">=4.8.4 <6.1.0"` fails the install (`ERESOLVE`); typed lint rules need the TS JS API    | [typescript-eslint/typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) |
| `vue-tsc`           | Type-checks `.vue` SFCs by patching the TS 6 compiler source at runtime — there is nothing to patch in the Go binary | [vuejs/language-tools#5381](https://github.com/vuejs/language-tools/issues/5381)                                 |

Both are blocked on the same upstream work: TypeScript 7 shipping an API /
plugin interop, tracked in
[microsoft/typescript-go#648](https://github.com/microsoft/typescript-go/issues/648)
and [microsoft/typescript-go#455 (discussion)](https://github.com/microsoft/typescript-go/discussions/455).
The 7.0 announcement targets **TypeScript 7.1** for a stable API and names
Vue explicitly as a workflow that has to wait for it.

## The setup

In `package.json` (JSON allows no comments, hence this file):

- `"typescript": "npm:@typescript/typescript6@…"` — the package name
  `typescript` resolves to Microsoft's TS 6 compatibility repackage, so
  typescript-eslint's peer dependency is satisfied and every tool that does
  `require("typescript")` gets the full TS 6 JS API. It ships its binary as
  `tsc6` (not `tsc`) to avoid a bin collision.
- `"@typescript/native": "npm:typescript@7.…"` — the real TypeScript 7;
  owns the `tsc` binary, which `typecheck:ts7` runs against the Vue-free
  projects (`tsc -b tsconfig.node.json tsconfig.e2e.json`).
- `scripts/vue-tsc6.js` — wrapper used by `npm run typecheck` and
  `npm run build`. vue-tsc cannot use the alias directly: it patches the file
  behind `typescript/lib/tsc`, and the repackage ships that as a one-line
  `require("@typescript/old/lib/tsc.js")` shim that `@volar/typescript`
  doesn't recognize. The wrapper resolves `@typescript/old` (the genuine
  typescript@6 behind the alias) and hands its real `tsc` entry point to
  vue-tsc's `run()`.

Editor note: the Vue (Volar) VS Code extension also needs the TS 6 API and
gets it from the workspace `typescript` alias. Don't install the
"TypeScript (Native Preview)" extension for this repo — it can't handle
`.vue` files and takes over as the default TS server.

## When and how to unwind

Once both tracking issues above are resolved (expected earliest: TS 7.1):

1. Replace the two aliased devDependencies with a single
   `"typescript": "7.x"`.
2. Bump `typescript-eslint` and `vue-tsc` to releases whose peer ranges /
   runtime support TS 7 (watch the two tracking issues for the versions).
3. Delete `scripts/vue-tsc6.js`, collapse `typecheck:vue`/`typecheck:ts7`
   back into a single `typecheck` running `vue-tsc -b` over the whole
   solution, and drop the `include` narrowing in `tsconfig.e2e.json`.
4. Delete this file and the README section referencing it.
