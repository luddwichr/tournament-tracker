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

## Gotchas

- To simulate a boot failure (old-browser white screen), intercept the bundle with a
  correct MIME type — without it Chromium blocks the module on MIME checking and no
  `error` event fires, which is a mock artifact, not app behavior:
  `playwright-cli route "**/src/main.ts*" --body="const x = ??!;" --content-type="text/javascript"`
- `document.body.textContent` includes the source of the inline `<script nomodule>` in
  index.html — don't grep body text for fallback strings; check `#app` content instead.
- `<noscript>` rendering: drive a context with `javaScriptEnabled: false` via
  `playwright-cli run-code`; assert via screenshot/boundingBox — `isVisible()` on the
  `noscript` locator reports false even when the content paints.
- Error log persistence lives at localStorage key `wc2026:errors:v1`
  (`playwright-cli --raw localstorage-get "wc2026:errors:v1"`), results at
  `wc2026:results:v1`.
