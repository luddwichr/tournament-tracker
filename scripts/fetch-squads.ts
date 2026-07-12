// fetch-squads.ts — Download the 2026 FIFA World Cup squads from Wikipedia
// and emit src/data/squads.ts.
//
// Usage:
//     node scripts/fetch-squads.ts
//
// The script fetches the raw wikitext via the Wikipedia API (no external
// deps), parses every {{nat fs g player|...}} template, cleans the player
// names, and writes a TypeScript module to src/data/squads.ts.
//
// Re-run whenever squad changes need to be updated; the output is
// deterministic for the same wikitext.

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Player {
  number: number
  name: string
  position: 'GK' | 'DF' | 'MF' | 'FW'
}

const WIKI_API =
  'https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_squads&prop=wikitext&format=json'

// Map Wikipedia level-3 headings → internal team ids used in teams.ts
const TEAM_ID_MAP = new Map<string, string>([
  // Group A
  ['Mexico', 'mex'],
  ['South Africa', 'rsa'],
  ['South Korea', 'kor'],
  ['Czech Republic', 'cze'],
  // Group B
  ['Canada', 'can'],
  ['Bosnia and Herzegovina', 'bih'],
  ['Qatar', 'qat'],
  ['Switzerland', 'sui'],
  // Group C
  ['Brazil', 'bra'],
  ['Morocco', 'mar'],
  ['Haiti', 'hai'],
  ['Scotland', 'sco'],
  // Group D
  ['United States', 'usa'],
  ['Paraguay', 'par'],
  ['Australia', 'aus'],
  ['Turkey', 'tur'],
  // Group E
  ['Germany', 'ger'],
  ['Curaçao', 'cuw'],
  ['Ivory Coast', 'civ'],
  ['Ecuador', 'ecu'],
  // Group F
  ['Netherlands', 'ned'],
  ['Japan', 'jpn'],
  ['Sweden', 'swe'],
  ['Tunisia', 'tun'],
  // Group G
  ['Belgium', 'bel'],
  ['Egypt', 'egy'],
  ['Iran', 'irn'],
  ['New Zealand', 'nzl'],
  // Group H
  ['Spain', 'esp'],
  ['Cape Verde', 'cpv'],
  ['Saudi Arabia', 'ksa'],
  ['Uruguay', 'uru'],
  // Group I
  ['France', 'fra'],
  ['Senegal', 'sen'],
  ['Iraq', 'irq'],
  ['Norway', 'nor'],
  // Group J
  ['Argentina', 'arg'],
  ['Algeria', 'alg'],
  ['Austria', 'aut'],
  ['Jordan', 'jor'],
  // Group K
  ['Portugal', 'por'],
  ['DR Congo', 'cod'],
  ['Uzbekistan', 'uzb'],
  ['Colombia', 'col'],
  // Group L
  ['England', 'eng'],
  ['Croatia', 'cro'],
  ['Ghana', 'gha'],
  ['Panama', 'pan'],
])

// Canonical team order — matches the order in src/data/teams.ts
const TEAM_ORDER = [
  'mex',
  'rsa',
  'kor',
  'cze',
  'can',
  'bih',
  'qat',
  'sui',
  'bra',
  'mar',
  'hai',
  'sco',
  'usa',
  'par',
  'aus',
  'tur',
  'ger',
  'cuw',
  'civ',
  'ecu',
  'ned',
  'jpn',
  'swe',
  'tun',
  'bel',
  'egy',
  'irn',
  'nzl',
  'esp',
  'cpv',
  'ksa',
  'uru',
  'fra',
  'sen',
  'irq',
  'nor',
  'arg',
  'alg',
  'aut',
  'jor',
  'por',
  'cod',
  'uzb',
  'col',
  'eng',
  'cro',
  'gha',
  'pan',
] as const

async function fetchWikitext(): Promise<string> {
  console.log('Fetching wikitext from Wikipedia API …')
  const res = await fetch(WIKI_API, { headers: { 'User-Agent': 'worldcup-2026-app/1.0' } })
  if (!res.ok) {
    console.error(`ERROR: ${res.status} ${res.statusText} fetching ${WIKI_API}`)
    process.exit(1)
  }
  const data = (await res.json()) as { parse: { wikitext: { '*': string } } }
  const wikitext = data.parse.wikitext['*']
  console.log(`  Downloaded ${wikitext.length.toLocaleString()} characters`)
  return wikitext
}

/** Remove wiki markup from a field value, returning a clean player name. */
function stripWiki(s: string): string {
  // [[Display|Link]] → Display
  s = s.replace(/\[\[([^|\]]+)\|([^\]]*)\]\]/g, '$2')
  // [[Name (disambiguation)]] → Name
  s = s.replace(/\[\[([^(\]]+)\s*\([^)]*\)\]\]/g, '$1')
  // [[Name]] → Name
  s = s.replace(/\[\[([^\]]+)\]\]/g, '$1')
  // Stray [[ or ]]
  s = s.replace(/\[\[|\]\]/g, '')
  // {{template}}
  s = s.replace(/\{\{[^}]*\}\}/g, '')
  // Bold / italic
  s = s.replace(/'''?/g, '')
  // XML refs
  s = s.replace(/<ref[^>]*\/>/g, '')
  s = s.replace(/<ref[^>]*>.*?<\/ref>/gs, '')
  // Trailing Wikipedia disambiguation suffix, e.g. a bare (non-piped) wikilink
  // target or a plain name string carrying "Matt Turner (soccer)". Piped
  // links (handled above) already resolve to their display text and never
  // reach this point with a disambiguator attached, so this only fires for
  // the unpiped-link / plain-text case: strip any "(...)" hanging off the
  // very end of the name.
  s = s.replace(/\s*\([^)]*\)\s*$/, '')
  return s.trim()
}

function parseSquads(wikitext: string): Map<string, Player[]> {
  const squads = new Map<string, Player[]>()

  // Split by level-3 headings (===Team===)
  const parts = wikitext.split(/^===([^=].+?)===\s*$/gm)

  for (let i = 1; i < parts.length; i += 2) {
    const heading = (parts[i] ?? '').trim()
    const body = parts[i + 1] ?? ''
    const teamId = TEAM_ID_MAP.get(heading)
    if (teamId === undefined) continue

    const players: Player[] = []
    for (const m of body.matchAll(/\{\{nat fs g player\|([^}]+)\}\}/gi)) {
      const params = m[1] ?? ''
      const noMatch = /(?:^|\|)no=(\d+)/.exec(params)
      const posMatch = /(?:^|\|)pos=(\w+)/.exec(params)
      const nameMatch = /(?:^|\|)name=([^|]+)/.exec(params)
      if (!noMatch || !posMatch || !nameMatch) continue
      const pos = posMatch[1]!.toUpperCase()
      if (pos !== 'GK' && pos !== 'DF' && pos !== 'MF' && pos !== 'FW') continue
      const name = stripWiki(nameMatch[1]!)
      if (!name) continue
      players.push({ number: Number(noMatch[1]), name, position: pos })
    }

    players.sort((a, b) => a.number - b.number)
    squads.set(teamId, players)
    console.log(`  ${heading.padEnd(45)} (${teamId}): ${players.length} players`)
  }

  return squads
}

function emitTypescript(squads: Map<string, Player[]>, outPath: string): void {
  const lines = [
    '// 2026 FIFA World Cup squads — 48 teams × 26 players each.',
    '// Source: https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads',
    '// Generated by scripts/fetch-squads.ts — do not edit by hand.',
    '// Player names in Latin script per Wikipedia. Shirt numbers per official FIFA list.',
    '',
    "import type { Player } from '../types/tournament'",
    "import type { TeamId } from './teams'",
    '',
    'export const squads: Record<TeamId, readonly Player[]> = {',
  ]

  for (const tid of TEAM_ORDER) {
    const players = squads.get(tid) ?? []
    lines.push(`  ${tid}: [`)
    for (const p of players) {
      const name = p.name.replaceAll('\\', '\\\\').replaceAll("'", "\\'")
      lines.push(`    { number: ${p.number}, name: '${name}', position: '${p.position}' },`)
    }
    lines.push('  ],')
  }

  lines.push('}')
  lines.push('')
  lines.push('/**')
  lines.push(' * Look up a squad by a team id that is only known as a plain `string` at the')
  lines.push(' * call site (e.g. from a `Team` prop, whose `id` field is `string` rather')
  lines.push(' * than the narrower `TeamId`). Returns an empty array for an unknown id.')
  lines.push(' */')
  lines.push('export function squadFor(teamId: string): readonly Player[] {')
  lines.push('  return (squads as Record<string, readonly Player[] | undefined>)[teamId] ?? []')
  lines.push('}')

  const content = lines.join('\n')
  writeFileSync(outPath, content, 'utf-8')

  const total = TEAM_ORDER.reduce((sum, tid) => sum + (squads.get(tid)?.length ?? 0), 0)
  console.log(`\nWrote ${outPath}`)
  console.log(`  ${TEAM_ORDER.length} teams, ${total} players, ${content.length.toLocaleString()} bytes`)
}

async function main(): Promise<void> {
  const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
  const outPath = join(repoRoot, 'src', 'data', 'squads.ts')

  const wikitext = await fetchWikitext()
  const squads = parseSquads(wikitext)

  const missing = TEAM_ORDER.filter((tid) => !squads.has(tid))
  if (missing.length > 0) {
    console.error(`\nWARNING: missing data for teams: ${JSON.stringify(missing)}`)
  }

  emitTypescript(squads, outPath)
}

await main()
