import { describe, expect, it } from 'vitest'
import { dirname, join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFileSync } from 'node:fs'

// The README and the docs cross-link each other by relative path, and a rename only shows up when a reader clicks
// through. This walks every tracked Markdown file and resolves those links, so a stale target fails the unit gate.

const ROOT = resolve(__dirname, '..', '..')

// Inline links, `[text](target)`, keeping the target and discarding an optional title.
// The two branches are disjoint, because the target excludes whitespace and the title part must start with some,
// so the match is linear rather than backtracking.
const LINK = /\]\(([^)\s]+)(?:\s[^)]*)?\)/g

// `git ls-files` is the exclusion list this test wants: tracked Markdown only, so node_modules, dist and coverage
// never appear, and no denylist here can drift out of sync with .gitignore.
// eslint-disable-next-line sonarjs/no-os-command-from-path -- resolving git by PATH is how every other dev script in this repo invokes it
const runGit = (args: string[]) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf-8' })

function trackedMarkdownFiles(): string[] {
  return runGit(['ls-files', '*.md']).split('\n').filter(Boolean)
}

/**
 * Blank out fenced blocks and inline code spans.
 * Prose about regexes is full of bracket-paren pairs that are not links, for example a `[.](ts|vue)$` grep pattern.
 */
function withoutCode(content: string): string {
  return content.replaceAll(/^```[\s\S]*?^```/gm, '').replaceAll(/`[^`\n]*`/g, '')
}

/** Relative link targets in `file`, as repo-relative paths with any `#anchor` removed. */
function relativeLinkTargets(file: string): string[] {
  const content = withoutCode(readFileSync(join(ROOT, file), 'utf-8'))
  const targets: string[] = []
  for (const match of content.matchAll(LINK)) {
    const target = match[1]
    if (!target) continue
    // External schemes and same-page anchors have no file to resolve.
    if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('#') || target.startsWith('//')) continue
    const path = target.split('#')[0]
    if (path) targets.push(join(dirname(file), path))
  }
  return targets
}

describe('relative Markdown links resolve to files that exist', () => {
  const files = trackedMarkdownFiles()

  it('finds Markdown files to check (sanity check)', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('%s', (file) => {
    const broken = relativeLinkTargets(file).filter((target) => !existsSync(join(ROOT, target)))
    expect(broken).toEqual([])
  })
})
