---
name: ci
description: Run this repo's CI gates locally before pushing, and watch or diagnose GitHub Actions results without misreading them
---

# CI for the WM 2026 Tracker

## The two gates

| Command               | Covers                                                                               | Runs in                     |
| --------------------- | ------------------------------------------------------------------------------------ | --------------------------- |
| `npm run check:code`  | typecheck, format, lint, knip, unit tests + coverage, SAST/secrets/licence/dep scans | `.githooks/pre-push` and CI |
| `npm run check:build` | `build` → e2e → `size-limit` → PWA e2e                                               | **CI only**                 |

`pre-push` deliberately runs only `check:code` (~20 s). That means anything touching
layout, DOM structure, CSS or `index.html` can sail through the push and still break CI.
Run `check:build` locally for those changes.

Both failures that reached CI in a recent commit were of exactly this kind: a
`scroll-snap` rule that moved the knockout bracket's initial scroll position, and header
cells that fell below axe's 24×24 target-size minimum.

## e2e runs against the built `dist/`, never the dev server

Both Playwright configs set `webServer.command` to `npm run preview` — that is
`vite preview`, which serves whatever is already in `dist/`. `npm run check:build` builds
first, so it is always self-consistent. Running a spec directly is not:

```bash
npm run build && npx playwright test e2e/knockout.spec.ts   # correct
npx playwright test e2e/knockout.spec.ts                    # tests a stale dist/
```

Forgetting the build makes a correct fix look like it still fails. That is a fast route to
reverting work that was actually right, so rebuild before concluding anything from a local
e2e run.

## Watching a run

**`gh pr checks` has no `--json` flag in the pinned CLI** (Debian `gh` 2.46.0 — verify with
`gh --version` before assuming otherwise; `gh run list` _does_ support `--json`). Passing it
fails with `unknown flag: --json` and prints nothing to stdout. Its human output is TSV:

```
name <TAB> state <TAB> elapsed <TAB> url
```

States are `pass`, `fail`, `pending`, `skipping`, `cancel`. Terminal means anything except
`pending`; `skipping` is terminal and normal here ("Deploy to Pages" skips on PRs).

A poll loop that emits each check as it lands, exits when all are terminal, and — critically —
reports its own breakage instead of going quiet:

```bash
PR=67; prev=""
while :; do
  s=$(gh pr checks "$PR" 2>&1)                       # 2>&1, so errors are inspectable
  if ! printf '%s' "$s" | grep -qP '\t'; then        # no TSV => not check data
    echo "WATCH ERROR: $(printf '%s' "$s" | head -1)"; break
  fi
  cur=$(printf '%s\n' "$s" | awk -F'\t' 'NF>2 && $2!="pending" {print $1": "$2}' | sort)
  comm -13 <(printf '%s\n' "$prev") <(printf '%s\n' "$cur")
  prev=$cur
  if ! printf '%s\n' "$s" | awk -F'\t' 'NF>2 && $2=="pending"' | grep -q .; then
    echo "CI COMPLETE"; break
  fi
  sleep 30
done
```

### Why this shape, specifically

A watcher built as `s=$(gh pr checks "$PR" --json name,bucket 2>/dev/null) || { sleep 30; continue; }`
polled a full CI run to completion and emitted **nothing for twenty minutes**. Three mistakes
compounded, and each one alone would have been survivable:

1. `--json` does not exist on this subcommand, so the call failed every iteration.
2. `2>/dev/null` discarded the `unknown flag` message that said exactly that.
3. `|| { ...; continue; }` turned the failure into a silent skip.

The fixes generalise: send stderr somewhere you can see it, validate that the output _looks
like_ the data you expect before parsing it, and make the error branch **emit** rather than
`continue`.

Run any command standalone once before wrapping it in a loop — one `gh pr checks 67 --json ...`
at the prompt would have shown the unknown flag immediately.

**Silence is never a status.** A watcher emitting nothing is indistinguishable from one whose
command never worked, so it is not evidence that CI is still running, and never evidence that
it passed. Confirm directly before reporting to anyone:

```bash
gh pr checks <n>
gh run list --branch <branch> --limit 3
```

## Diagnosing a failed run

`gh run view <id> --log-failed` buries the real error under ~200 lines of flag-SVG build
output. Filter it:

```bash
gh run view <id> --log-failed | grep -iE "error|✘|expect|Received|violation" | grep -viE "svg|gzip"
```

For a11y failures the CI log only shows the violation count. Reproduce locally
(`npm run build && npx playwright test e2e/groups.spec.ts`) and read
`test-results/<test>/error-context.md`, which Playwright writes on failure — it holds the full
axe violation including the offending element's measured size. A `test-failed-1.png` lands
beside it, and for layout bugs that screenshot is usually faster than the assertion message:
the bracket `scroll-snap` regression was obvious the moment the screenshot showed the group
column missing.

## Editing a PR body

`gh pr edit --body-file` can emit a Projects-classic GraphQL deprecation error and leave the
body **unchanged**, without looking like a failure. Patch through the REST API and verify:

```bash
python3 -c "import json; print(json.dumps({'body': open('pr.md').read()}))" > body.json
gh api repos/<owner>/<repo>/pulls/<n> -X PATCH --input body.json --jq '.number'
gh pr view <n> --json body --jq '.body' | grep -nE '^## '   # confirm it actually applied
```
