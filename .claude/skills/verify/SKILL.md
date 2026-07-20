---
name: verify
description: Build/launch/drive recipe for verifying changes to this app at runtime
---

# Verifying WM 2026 Tracker changes at runtime

## Launch

```bash
npm run dev          # Vite dev server on http://localhost:5173, ready in ~2s
```

Routes: `/` (Gruppen), `/knockout`, `/ranking`, `/settings`. German UI.

## Drive

Use `playwright-cli` (globally installed): `playwright-cli open http://localhost:5173/<route>`,
then `find "<German label>"` / `click <ref>` / `eval`. Close with `playwright-cli close`.

For scripted scenarios prefer extending the e2e suite (`e2e/*.spec.ts`, page objects in
`e2e/support/`). `npx playwright test <spec>` starts a server itself, but it is
`npm run preview` serving the prebuilt `dist/` — **not** the dev server — so run
`npm run build` first or you are testing stale output (see the `ci` skill).
`e2e/error-visibility.spec.ts` shows how to simulate boot failures (module interception
needs a JavaScript MIME type) and how to assert on `<noscript>` content (Playwright's
visibility check misreports it — use text + boundingBox).

## Gotchas

- `document.body.textContent` includes the source of the inline `<script nomodule>` in
  index.html — don't grep body text for fallback strings; check `#app` content instead.
- Error log persistence lives at localStorage key `wc2026:errors:v1`
  (`playwright-cli --raw localstorage-get "wc2026:errors:v1"`), results at
  `wc2026:results:v2`.
