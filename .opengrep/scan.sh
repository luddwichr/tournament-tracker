#!/usr/bin/env bash
# Perform static code analysis for security checks using opengrep.
# opengrep has no project config file for listing registry packs by name, so the packs are named here.
# Multiple --config flags is the documented way to combine them, see `opengrep scan --help`.
#
# p/security-audit and p/javascript are community registry rulesets.
# p/typescript is left out because it holds exactly the same rules as p/javascript, so it only adds duplicate warnings.
# .opengrep/rules.yml is our own rule guarding against incomplete regex-based sanitization.
# See its header comment for why the registry does not already cover it.
# --error turns a finding into a non-zero exit, which is what makes this a gate rather than a report.
# --enable-interfile lets the taint rules that support it follow data across files instead of within one file.
# It roughly doubles the scan time, which is a few seconds here.
# It needs opengrep 2 or newer, because opengrep 1 rejects the flag.
set -euo pipefail
cd "$(dirname "$0")/.."
exec opengrep scan \
  --config p/security-audit \
  --config p/javascript \
  --config .opengrep/rules.yml \
  --enable-interfile \
  --error \
  "$@"
