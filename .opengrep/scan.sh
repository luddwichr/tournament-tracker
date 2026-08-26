#!/bin/sh
# Perform static code analysis for security checks using opengrep.
# opengrep has no project config file for listing registry packs by name, so the packs are named here.
# Multiple --config flags is the documented way to combine them, see `opengrep scan --help`.
#
# p/security-audit, p/javascript and p/typescript are community registry rulesets.
# .opengrep/rules.yml is our own rule guarding against incomplete regex-based sanitization.
# See its header comment for why the registry does not already cover it.
# --error turns a finding into a non-zero exit, which is what makes this a gate rather than a report.
set -eu
cd "$(dirname "$0")/.."
exec opengrep scan \
  --config p/security-audit \
  --config p/javascript \
  --config p/typescript \
  --config .opengrep/rules.yml \
  --error \
  "$@"
