#!/bin/sh
# Runs typecheck, lint, and unit tests when .ts or .vue files are dirty.
# Exits 2 on failure so asyncRewake can surface the output back to Claude.
git status --porcelain 2>/dev/null | grep -qE '[.](ts|vue)$' || exit 0
npm run typecheck && npm run lint && npm run test:unit || exit 2
