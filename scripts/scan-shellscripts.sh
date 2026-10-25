#!/usr/bin/env bash
# Runs shellcheck over every shell script in the repo, for `npm run scan:shellscripts`.
# The tool accepts file arguments only, so the list of scripts has to be built here.
# Arguments passed to this script are forwarded to shellcheck, for example `--format=json`.
set -euo pipefail

# The pathspecs below are relative to the repo root, so go there whatever the caller's directory was.
cd "$(dirname "$0")/.."

# git ls-files is the file lister because it consults .gitignore.
# That keeps node_modules and the build output out without naming either of them here.
# --cached and --others together mean tracked plus untracked, so a new script is checked before it is committed.
# --exclude-standard reapplies the ignore rules, which --others would otherwise bypass.
# The .githooks entries are named explicitly because they carry no .sh suffix.
# -z and xargs -0 separate paths with NUL, so a path containing spaces stays one entry.
# pipefail makes a git failure fail the scan instead of passing an empty list to xargs.
# --severity=style is the strictest level, and --enable all adds the checks that are off by default.
# The trailing -- ends the option list, so a path starting with a dash is still treated as a file.
git ls-files -z --cached --others --exclude-standard '*.sh' .githooks/pre-commit .githooks/pre-push \
  | xargs -0 shellcheck --severity=style --enable all "$@" --
