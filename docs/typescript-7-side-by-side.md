# TypeScript 6 + 7 side-by-side setup

This project compiles with TypeScript 7 but keeps TypeScript 6 installed alongside it, following the setup from the
[TypeScript 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0).
This file documents why, what the workarounds are, and when they can be removed.

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
  owns the `tsc` binary.
- `scripts/vue-tsc6.mjs` — wrapper used by `npm run typecheck` and
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
3. Delete `scripts/vue-tsc6.mjs` and point the `build` and `typecheck`
   scripts back at `vue-tsc -b`.
4. Delete this file and the README section referencing it.
