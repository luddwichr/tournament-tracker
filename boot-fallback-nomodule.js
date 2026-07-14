// Browsers without ES-module support skip the bundle without firing any
// error event, so the error listener in boot-safety-net.js never triggers —
// show its fallback message directly. Relies on that script having already
// set window.__showBootFallback (see index.html script order).
window.__showBootFallback()
