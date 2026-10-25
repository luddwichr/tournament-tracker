#!/usr/bin/env bash
# Auto-formats, then runs the same gate as .githooks/pre-push.
# Running anything narrower here just moves failures to push time, which is the worst moment to discover them.
# Exits 2 on failure so asyncRewake can surface the output back to Claude.
# On success (exit 0) the hook adds nothing to the context, so the silent format fix here is free.
set -euo pipefail

# The dirty check is deliberately extension-agnostic.
# Filtering to .ts and .vue skipped edits to styles, lint config and package.json, all of which this gate covers.
# It tests the output directly instead of piping into `grep -q`, which pipefail can turn into a false "clean".
# Outside a git checkout there is nothing to check, so a failing git status skips the gate too.
changes=$(git status --porcelain 2>/dev/null) || exit 0
[[ -n "${changes}" ]] || exit 0
npm run format && npm run check:code || exit 2
