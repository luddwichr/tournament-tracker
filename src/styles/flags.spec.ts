import { describe, expect, it } from 'vitest'
import { fifaRanking } from '../data/fifa-ranking'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { teams } from '../data/teams'

// Regression guard for the flag-icons subset: flags.scss compiles CSS for
// exactly the flag codes listed in $flag-icons-included-countries. A code used
// by the data modules but missing from the list renders as a blank flag with
// no build error; a listed code no longer used anywhere ships dead SVG payload.

const FLAGS_FILE = join(__dirname, 'flags.scss')

function extractIncludedCountries(scss: string): string[] {
  const listMatch = /\$flag-icons-included-countries:\s*\(([^)]*)\)/.exec(scss)
  if (!listMatch?.[1]) throw new Error('flags.scss: $flag-icons-included-countries list not found')
  return [...listMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]!)
}

describe('flag-icons subset', () => {
  const included = extractIncludedCountries(readFileSync(FLAGS_FILE, 'utf-8'))
  const includedSet = new Set(included)
  const usedSet = new Set<string>([...teams, ...fifaRanking].map((entry) => entry.flagCode))

  it('lists every flag code used by teams.ts and fifa-ranking.ts', () => {
    const missing = [...usedSet].filter((code) => !includedSet.has(code))
    expect(missing).toEqual([])
  })

  it('lists no flag code the data modules do not use', () => {
    const unused = included.filter((code) => !usedSet.has(code))
    expect(unused).toEqual([])
  })

  it('has no duplicate entries', () => {
    expect(included).toHaveLength(includedSet.size)
  })
})
