// Single Page Apps for GitHub Pages
// MIT License
// https://github.com/rafgraph/spa-github-pages
// Restores the real path encoded by public/404.html's redirect before the router reads window.location.
;(function (location) {
  if (location.search[1] === '/') {
    const decoded = location.search
      .slice(1)
      .split('&')
      .map((s) => s.replace(/~and~/g, '&'))
      .join('?')
    window.history.replaceState(null, '', location.pathname.slice(0, -1) + decoded + location.hash)
  }
})(window.location)
