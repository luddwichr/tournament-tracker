// Theme bootstrap: applies the persisted theme before first paint.
//
// App.vue applies the theme in a post-hydration watchEffect, which is far too
// late.
// A light-mode user on a dark-OS device, or vice versa, sees a flash of the wrong palette on every cold start. This script runs synchronously in
// <head>, ahead of the app bundle, so the correct `data-theme` is on <html>
// before anything is painted.
//
// It also keeps the theme-color meta in sync, so the OS browser chrome tracks
// the active palette instead of a fixed one.
//
// Kept out of index.html (rather than inline) so the CSP can keep script-src
// at 'self' with no 'unsafe-inline', which is the same reasoning as boot-safety-net.js.
// Must stay self-contained ES5 for the same reason as that file: it has to run
// even where the es2025 app bundle fails to parse.
//
// The storage key and value shape mirror the `settings` Pinia store
// in src/stores/settings.ts, persisted via pinia-plugin-persistedstate, so keep them in sync.
// The colors mirror --color-bg in src/styles/tokens.css.
;(function () {
  var LIGHT_BG = '#f8fafc'
  var DARK_BG = '#0f172a'

  function storedTheme() {
    try {
      var raw = localStorage.getItem('settings')
      var theme = raw ? JSON.parse(raw).theme : null
      return theme === 'light' || theme === 'dark' ? theme : 'system'
      // eslint-disable-next-line sonarjs/no-ignored-exceptions -- must stay ES5 (see file header), so optional catch binding isn't available; an unreadable/corrupt entry just means "no explicit choice"
    } catch (e) {
      return 'system'
    }
  }

  var theme = storedTheme()

  // 'system' means no explicit choice: leave the attribute off so the unscoped
  // `@media (prefers-color-scheme: dark)` block in tokens.css decides, exactly
  // as App.vue's watchEffect does.
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }

  var dark =
    theme === 'dark' ||
    (theme === 'system' && typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches)

  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? DARK_BG : LIGHT_BG)
})()
