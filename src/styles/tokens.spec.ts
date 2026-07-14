import { describe, expect, it } from 'vitest'
import { extname, join } from 'node:path'
import { readFileSync, readdirSync } from 'node:fs'

// Regression guard for design-token drift: every `var(--xxx)` reference in the
// app must resolve to a custom property actually defined in tokens.css.
// Without this, a typo like `var(--font-size-md)` (tokens.css only defines
// `--font-size-base`) silently resolves to nothing instead of erroring, so
// the affected element just falls back to its inherited value.

const SRC_DIR = join(__dirname, '..')
const TOKENS_FILE = join(__dirname, 'tokens.css')

// Custom properties that components legitimately define *and* consume
// themselves (component-local "CSS variables", not global design tokens).
// These live outside tokens.css on purpose and must not be flagged.
const COMPONENT_LOCAL_EXCEPTIONS = new Set(['dialog-max-width', 'dialog-max-height', 'card-icon-count-size'])

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, files)
    } else if (extname(entry.name) === '.vue' || extname(entry.name) === '.css') {
      files.push(full)
    }
  }
  return files
}

function extractDefinedTokens(css: string): Set<string> {
  const defined = new Set<string>()
  for (const match of css.matchAll(/(?:^|[\s{;])--([a-zA-Z][\w-]*)\s*:/g)) {
    if (match[1]) defined.add(match[1])
  }
  return defined
}

function extractReferencedTokens(source: string): string[] {
  const referenced: string[] = []
  for (const match of source.matchAll(/var\(\s*--([a-zA-Z][\w-]*)/g)) {
    if (match[1]) referenced.push(match[1])
  }
  return referenced
}

describe('design tokens', () => {
  const tokensCss = readFileSync(TOKENS_FILE, 'utf-8')
  const definedTokens = extractDefinedTokens(tokensCss)

  it('tokens.css itself defines at least the known font-size scale (sanity check)', () => {
    for (const name of ['font-size-xs', 'font-size-sm', 'font-size-base', 'font-size-lg', 'font-size-xl']) {
      expect(definedTokens.has(name)).toBe(true)
    }
  })

  it('every var(--xxx) reference under src/ resolves to a token defined in tokens.css', () => {
    const files = walk(SRC_DIR).filter((f) => f !== TOKENS_FILE)
    const undefinedRefs: string[] = []

    for (const file of files) {
      const source = readFileSync(file, 'utf-8')
      for (const name of extractReferencedTokens(source)) {
        if (COMPONENT_LOCAL_EXCEPTIONS.has(name)) continue
        if (!definedTokens.has(name)) {
          undefinedRefs.push(`${file.replace(SRC_DIR, 'src')}: var(--${name})`)
        }
      }
    }

    expect(undefinedRefs).toEqual([])
  })
})
