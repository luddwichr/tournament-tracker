#!/bin/sh
# Config for `npm run security`. opengrep has no project config file for
# listing registry packs by name.
# Multiple --config flags is the documented way to combine them, see `opengrep scan --help`.
#
# p/security-audit, p/javascript, p/typescript: community registry rulesets.
# rules.yml: our own rule guarding against incomplete regex-based sanitization
# (see its header comment for why the registry doesn't already cover it).
set -eu
cd "$(dirname "$0")/.."
exec opengrep scan \
  --config p/security-audit \
  --config p/javascript \
  --config p/typescript \
  --config .opengrep/rules.yml \
  --error \
  "$@"
