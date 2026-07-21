// Browsers without ES-module support skip the bundle without firing any
// error event, so the error listener in boot-safety-net.js never triggers.
// Show its fallback message directly instead.
// This relies on that script having already set window.__showBootFallback, see the index.html script order.
window.__showBootFallback()
