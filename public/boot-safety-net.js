// Boot-error safety net: the app bundle targets es2025, so on an older
// browser the module fails to parse and Vue (including its errorHandler)
// never runs. This script must therefore stay self-contained ES5. It
// logs every uncaught error/rejection to localStorage (same key + entry
// shape as src/lib/error-log.ts, so keep them in sync).
// If the app never mounted, it replaces the silent white screen with a visible message.
//
// Loaded as a plain (non-module) <script src> ahead of the app bundle so it
// keeps executing even where module scripts are unsupported or blocked; kept
// out of index.html itself (rather than inline) so the CSP can omit
// 'unsafe-inline' from script-src.
;(function () {
  function log(source, message) {
    try {
      var key = 'wc2026:errors:v1'
      var entries = JSON.parse(localStorage.getItem(key) || '[]')
      if (!Array.isArray(entries)) entries = []
      entries.push({ message: String(message), source: source, time: new Date().toISOString() })
      localStorage.setItem(key, JSON.stringify(entries.slice(-20)))
      // eslint-disable-next-line sonarjs/no-ignored-exceptions -- must stay ES5 (see file header), so optional catch binding isn't available; localStorage being unavailable is genuinely unrecoverable here
    } catch (e) {
      // localStorage is unavailable, and there is nothing sensible left to do.
    }
  }
  function showFallbackIfNotMounted() {
    var app = document.getElementById('app')
    if (!app || app.childNodes.length > 0) return // Vue mounted; it owns the screen now
    app.innerHTML =
      '<p class="boot-fallback">Die App konnte nicht geladen werden. Möglicherweise ist dein Browser zu alt. ' +
      'Bitte versuche es mit einem aktuellen Browser erneut.</p>'
  }
  // Also called by the <script nomodule> fallback at the end of <body>.
  window.__showBootFallback = showFallbackIfNotMounted
  window.addEventListener('error', function (event) {
    log('window', event.message || 'Unbekannter Fehler')
    showFallbackIfNotMounted()
  })
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason
    log('promise', reason && reason.message ? reason.message : String(reason))
  })
})()
