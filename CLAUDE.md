# CLAUDE.md

## Conventions

- **Pin npm dependencies to exact versions.** Never use `^` or `~` ranges in
  `package.json`. Install with `npm i -E <pkg>` (or `npm i <pkg> && npm pkg ...`)
  and verify the specifier has no range prefix before committing.
- **Prefer non-mutating array methods.** Use `toSorted()`, `toReversed()`, and
  `toSpliced()` instead of `sort()`, `reverse()`, and `splice()`. The linter
  (`oxlint unicorn/no-array-sort`) enforces this and will fail the build.

## Git

- **The pre-commit hook stages every modified tracked file.** `.githooks/pre-commit`
  runs `npm run format` then `git add -u`, so a commit always sweeps in _all_
  tracked changes in the working tree — not just the files you staged. To commit
  a scoped subset, stash the changes you want to exclude first
  (`git stash push -- <paths>`), commit, then `git stash pop`.
