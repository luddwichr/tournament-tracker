import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'

// Regression guard for the ES target duplicated across tsconfig.base.json,
// tsconfig.app.json's/tsconfig.node.json's `lib`, and vite.config.ts's
// `build.target` — previously kept in sync only by "keep in sync" comments
// with nothing enforcing it.

const ROOT = join(__dirname, '..', '..')

interface TsconfigShape {
  compilerOptions?: { target?: string; lib?: string[] }
}

function readJsonc(path: string): TsconfigShape {
  const raw = readFileSync(join(ROOT, path), 'utf-8')
  const stripped = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
  return JSON.parse(stripped) as TsconfigShape
}

describe('build target stays in sync across configs', () => {
  const target = readJsonc('tsconfig.base.json').compilerOptions?.target

  it('tsconfig.base.json defines a target (sanity check)', () => {
    expect(target).toBeTruthy()
  })

  it('tsconfig.app.json lib includes the same ES version as the target', () => {
    expect(readJsonc('tsconfig.app.json').compilerOptions?.lib).toContain(target)
  })

  it('tsconfig.node.json lib includes the same ES version as the target', () => {
    expect(readJsonc('tsconfig.node.json').compilerOptions?.lib).toContain(target)
  })

  it('vite.config.ts build.target matches (case-insensitively)', () => {
    const viteConfig = readFileSync(join(ROOT, 'vite.config.ts'), 'utf-8')
    const match = /target:\s*'([^']+)'/.exec(viteConfig)
    expect(match?.[1]?.toLowerCase()).toBe(target?.toLowerCase())
  })
})
