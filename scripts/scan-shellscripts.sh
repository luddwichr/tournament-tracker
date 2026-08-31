#!/bin/sh
# Runs shellcheck over every shell script in the repo, for `npm run scan:shellscripts`.
# The tool accepts file arguments only, so the list of scripts has to be built here.
# Arguments passed to this script are forwarded to shellcheck, for example `--format=json`.
set -eu

# The pathspecs below are relative to the repo root, so go there whatever the caller's directory was.
cd "$(dirname "$0")/.."

# The file list goes through a temporary file rather than a pipe.
# A pipe would hide a git failure, because `set -e` does not see the exit status of an early pipeline stage.
# The trap removes the file on every exit path, including a failed run.
list=$(mktemp)
trap 'rm -f "${list}"' EXIT

# git ls-files is the file lister because it consults .gitignore.
# That keeps node_modules and the build output out without naming either of them here.
# --cached and --others together mean tracked plus untracked, so a new script is checked before it is committed.
# --exclude-standard reapplies the ignore rules, which --others would otherwise bypass.
# The .githooks entries are named explicitly because they carry no .sh suffix.
# -z separates paths with NUL, so a path containing spaces stays one entry.
git ls-files -z --cached --others --exclude-standard '*.sh' .githooks/pre-commit .githooks/pre-push >"${list}"

# -0 is the counterpart to the -z above.
# --severity=style is the strictest level, and --enable all adds the checks that are off by default.
# The trailing -- ends the option list, so a path starting with a dash is still treated as a file.
xargs -0 shellcheck --severity=style --enable all "$@" -- <"${list}"
