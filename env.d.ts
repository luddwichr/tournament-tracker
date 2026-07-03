/// <reference types="vite-plugin-pwa/client" />

// `export {}` makes this a module so the augmentation below merges with
// vue-router's real types instead of replacing them (a `declare module`
// block in a non-module ambient file redeclares the module wholesale).
// This must live in a file every tsconfig project includes directly (this
// one is) — a project whose narrowed `include` only transitively reaches
// App.vue without also reaching router.ts (where this used to live) would
// otherwise type-check `route.meta.title` against the unaugmented RouteMeta
// index signature.
// oxlint-disable-next-line unicorn/require-module-specifiers -- the empty export is load-bearing here, not dead code; see comment above
export {}

declare module 'vue-router' {
  interface RouteMeta {
    /** Page title — drives both the document title and the a11y announcement. */
    title?: string
  }
}
