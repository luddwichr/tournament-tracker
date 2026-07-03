# CLAUDE.md

## Conventions

- **Pin npm dependencies to exact versions.** Never use `^` or `~` ranges in
  `package.json`. Install with `npm i -E <pkg>` (or `npm i <pkg> && npm pkg ...`)
  and verify the specifier has no range prefix before committing.
- **Prefer non-mutating array methods.** Use `toSorted()`, `toReversed()`, and
  `toSpliced()` instead of `sort()`, `reverse()`, and `splice()`. The linter
  (`oxlint unicorn/no-array-sort`) enforces this and will fail the build.