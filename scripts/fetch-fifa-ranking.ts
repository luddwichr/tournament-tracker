// fetch-fifa-ranking.ts — Download the full FIFA/Coca-Cola Men's World Ranking
// and emit src/data/fifa-ranking.ts.
//
// Usage:
//     node scripts/fetch-fifa-ranking.ts
//
// The script scrapes the complete 211-team ranking table (rank, team, points)
// from whereig.com — which mirrors the official FIFA release — using only
// built-ins, then writes a TypeScript module to src/data/fifa-ranking.ts.
//
// The source lists teams with English names. TEAM_MAP translates each to the
// German display name and the `flag-icons` CSS code used elsewhere in the app;
// it is the durable part of this script (team identities are stable even as
// ranks and points change between releases). If FIFA admits a new association
// or the source renames a team, add the row to TEAM_MAP and re-run.
//
// Re-run after each monthly FIFA release; the output is deterministic for a
// given snapshot of the source table.

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'

const SOURCE_URL = 'https://www.whereig.com/football/fifa-world-rankings.html'

// Source English team name -> [German display name, flag-icons code].
// Verified against src/data/teams.ts for the 48 World Cup participants.
const TEAM_MAP = new Map<string, readonly [string, string]>([
  ['Argentina', ['Argentinien', 'ar']],
  ['Spain', ['Spanien', 'es']],
  ['France', ['Frankreich', 'fr']],
  ['England', ['England', 'gb-eng']],
  ['Portugal', ['Portugal', 'pt']],
  ['Brazil', ['Brasilien', 'br']],
  ['Morocco', ['Marokko', 'ma']],
  ['Netherlands', ['Niederlande', 'nl']],
  ['Belgium', ['Belgien', 'be']],
  ['Germany', ['Deutschland', 'de']],
  ['Croatia', ['Kroatien', 'hr']],
  ['Italy', ['Italien', 'it']],
  ['Colombia', ['Kolumbien', 'co']],
  ['Mexico', ['Mexiko', 'mx']],
  ['Senegal', ['Senegal', 'sn']],
  ['Uruguay', ['Uruguay', 'uy']],
  ['USA', ['USA', 'us']],
  ['Japan', ['Japan', 'jp']],
  ['Switzerland', ['Schweiz', 'ch']],
  ['IR Iran', ['Iran', 'ir']],
  ['Denmark', ['Dänemark', 'dk']],
  ['Türkiye', ['Türkei', 'tr']],
  ['Ecuador', ['Ecuador', 'ec']],
  ['Austria', ['Österreich', 'at']],
  ['Korea Republic', ['Südkorea', 'kr']],
  ['Nigeria', ['Nigeria', 'ng']],
  ['Australia', ['Australien', 'au']],
  ['Algeria', ['Algerien', 'dz']],
  ['Egypt', ['Ägypten', 'eg']],
  ['Canada', ['Kanada', 'ca']],
  ['Norway', ['Norwegen', 'no']],
  ['Ukraine', ['Ukraine', 'ua']],
  ["Côte d'Ivoire", ['Elfenbeinküste', 'ci']],
  ['Panama', ['Panama', 'pa']],
  ['Russia', ['Russland', 'ru']],
  ['Poland', ['Polen', 'pl']],
  ['Wales', ['Wales', 'gb-wls']],
  ['Sweden', ['Schweden', 'se']],
  ['Hungary', ['Ungarn', 'hu']],
  ['Czechia', ['Tschechien', 'cz']],
  ['Paraguay', ['Paraguay', 'py']],
  ['Scotland', ['Schottland', 'gb-sct']],
  ['Serbia', ['Serbien', 'rs']],
  ['Cameroon', ['Kamerun', 'cm']],
  ['Tunisia', ['Tunesien', 'tn']],
  ['Congo DR', ['DR Kongo', 'cd']],
  ['Slovakia', ['Slowakei', 'sk']],
  ['Greece', ['Griechenland', 'gr']],
  ['Venezuela', ['Venezuela', 've']],
  ['Uzbekistan', ['Usbekistan', 'uz']],
  ['Chile', ['Chile', 'cl']],
  ['Peru', ['Peru', 'pe']],
  ['Costa Rica', ['Costa Rica', 'cr']],
  ['Romania', ['Rumänien', 'ro']],
  ['Mali', ['Mali', 'ml']],
  ['Qatar', ['Katar', 'qa']],
  ['Iraq', ['Irak', 'iq']],
  ['Republic of Ireland', ['Irland', 'ie']],
  ['Slovenia', ['Slowenien', 'si']],
  ['South Africa', ['Südafrika', 'za']],
  ['Saudi Arabia', ['Saudi-Arabien', 'sa']],
  ['Burkina Faso', ['Burkina Faso', 'bf']],
  ['Jordan', ['Jordanien', 'jo']],
  ['Bosnia and Herzegovina', ['Bosnien H.', 'ba']],
  ['Honduras', ['Honduras', 'hn']],
  ['Albania', ['Albanien', 'al']],
  ['Cabo Verde', ['Kap Verde', 'cv']],
  ['United Arab Emirates', ['Ver. Arab. Emirate', 'ae']],
  ['North Macedonia', ['Nordmazedonien', 'mk']],
  ['Northern Ireland', ['Nordirland', 'gb-nir']],
  ['Jamaica', ['Jamaika', 'jm']],
  ['Georgia', ['Georgien', 'ge']],
  ['Ghana', ['Ghana', 'gh']],
  ['Iceland', ['Island', 'is']],
  ['Finland', ['Finnland', 'fi']],
  ['Israel', ['Israel', 'il']],
  ['Bolivia', ['Bolivien', 'bo']],
  ['Kosovo', ['Kosovo', 'xk']],
  ['Oman', ['Oman', 'om']],
  ['Montenegro', ['Montenegro', 'me']],
  ['Guinea', ['Guinea', 'gn']],
  ['Curaçao', ['Curaçao', 'cw']],
  ['Haiti', ['Haiti', 'ht']],
  ['Syria', ['Syrien', 'sy']],
  ['New Zealand', ['Neuseeland', 'nz']],
  ['Gabon', ['Gabun', 'ga']],
  ['Bulgaria', ['Bulgarien', 'bg']],
  ['Angola', ['Angola', 'ao']],
  ['Uganda', ['Uganda', 'ug']],
  ['Zambia', ['Sambia', 'zm']],
  ['China PR', ['China', 'cn']],
  ['Bahrain', ['Bahrain', 'bh']],
  ['Benin', ['Benin', 'bj']],
  ['Thailand', ['Thailand', 'th']],
  ['Palestine', ['Palästina', 'ps']],
  ['Belarus', ['Belarus', 'by']],
  ['Guatemala', ['Guatemala', 'gt']],
  ['Luxembourg', ['Luxemburg', 'lu']],
  ['Vietnam', ['Vietnam', 'vn']],
  ['El Salvador', ['El Salvador', 'sv']],
  ['Tajikistan', ['Tadschikistan', 'tj']],
  ['Trinidad and Tobago', ['Trinidad und Tobago', 'tt']],
  ['Mozambique', ['Mosambik', 'mz']],
  ['Madagascar', ['Madagaskar', 'mg']],
  ['Equatorial Guinea', ['Äquatorialguinea', 'gq']],
  ['Kyrgyz Republic', ['Kirgisistan', 'kg']],
  ['Armenia', ['Armenien', 'am']],
  ['Comoros', ['Komoren', 'km']],
  ['Kenya', ['Kenia', 'ke']],
  ['Libya', ['Libyen', 'ly']],
  ['Kazakhstan', ['Kasachstan', 'kz']],
  ['Tanzania', ['Tansania', 'tz']],
  ['Mauritania', ['Mauretanien', 'mr']],
  ['Niger', ['Niger', 'ne']],
  ['Lebanon', ['Libanon', 'lb']],
  ['The Gambia', ['Gambia', 'gm']],
  ['Sudan', ['Sudan', 'sd']],
  ['Indonesia', ['Indonesien', 'id']],
  ['Togo', ['Togo', 'tg']],
  ['Korea DPR', ['Nordkorea', 'kp']],
  ['Namibia', ['Namibia', 'na']],
  ['Sierra Leone', ['Sierra Leone', 'sl']],
  ['Faroe Islands', ['Färöer', 'fo']],
  ['Cyprus', ['Zypern', 'cy']],
  ['Suriname', ['Suriname', 'sr']],
  ['Azerbaijan', ['Aserbaidschan', 'az']],
  ['Estonia', ['Estland', 'ee']],
  ['Rwanda', ['Ruanda', 'rw']],
  ['Malawi', ['Malawi', 'mw']],
  ['Zimbabwe', ['Simbabwe', 'zw']],
  ['Nicaragua', ['Nicaragua', 'ni']],
  ['Guinea-Bissau', ['Guinea-Bissau', 'gw']],
  ['Kuwait', ['Kuwait', 'kw']],
  ['Congo', ['Kongo', 'cg']],
  ['Philippines', ['Philippinen', 'ph']],
  ['Malaysia', ['Malaysia', 'my']],
  ['Latvia', ['Lettland', 'lv']],
  ['India', ['Indien', 'in']],
  ['Central African Republic', ['Zentralafrik. Republik', 'cf']],
  ['Liberia', ['Liberia', 'lr']],
  ['Turkmenistan', ['Turkmenistan', 'tm']],
  ['Burundi', ['Burundi', 'bi']],
  ['Ethiopia', ['Äthiopien', 'et']],
  ['Dominican Republic', ['Dominikanische Rep.', 'do']],
  ['Yemen', ['Jemen', 'ye']],
  ['Lesotho', ['Lesotho', 'ls']],
  ['Botswana', ['Botswana', 'bw']],
  ['Singapore', ['Singapur', 'sg']],
  ['Lithuania', ['Litauen', 'lt']],
  ['Guyana', ['Guyana', 'gy']],
  ['New Caledonia', ['Neukaledonien', 'nc']],
  ['St Kitts and Nevis', ['St. Kitts und Nevis', 'kn']],
  ['Solomon Islands', ['Salomonen', 'sb']],
  ['Puerto Rico', ['Puerto Rico', 'pr']],
  ['Fiji', ['Fidschi', 'fj']],
  ['Hong Kong, China', ['Hongkong', 'hk']],
  ['Tahiti', ['Tahiti', 'pf']],
  ['Myanmar', ['Myanmar', 'mm']],
  ['Moldova', ['Moldau', 'md']],
  ['Vanuatu', ['Vanuatu', 'vu']],
  ['Malta', ['Malta', 'mt']],
  ['Antigua and Barbuda', ['Antigua und Barbuda', 'ag']],
  ['Grenada', ['Grenada', 'gd']],
  ['Cuba', ['Kuba', 'cu']],
  ['Eswatini', ['Eswatini', 'sz']],
  ['St Lucia', ['St. Lucia', 'lc']],
  ['Bermuda', ['Bermuda', 'bm']],
  ['Papua New Guinea', ['Papua-Neuguinea', 'pg']],
  ['South Sudan', ['Südsudan', 'ss']],
  ['St Vincent and the Grenadines', ['St. Vincent u. d. Gren.', 'vc']],
  ['Afghanistan', ['Afghanistan', 'af']],
  ['Andorra', ['Andorra', 'ad']],
  ['Maldives', ['Malediven', 'mv']],
  ['Chinese Taipei', ['Chinesisch-Taipeh', 'tw']],
  ['Cambodia', ['Kambodscha', 'kh']],
  ['Montserrat', ['Montserrat', 'ms']],
  ['Nepal', ['Nepal', 'np']],
  ['Mauritius', ['Mauritius', 'mu']],
  ['Barbados', ['Barbados', 'bb']],
  ['Belize', ['Belize', 'bz']],
  ['Bangladesh', ['Bangladesch', 'bd']],
  ['Dominica', ['Dominica', 'dm']],
  ['Chad', ['Tschad', 'td']],
  ['Eritrea', ['Eritrea', 'er']],
  ['Laos', ['Laos', 'la']],
  ['Cook Islands', ['Cookinseln', 'ck']],
  ['Sri Lanka', ['Sri Lanka', 'lk']],
  ['Samoa', ['Samoa', 'ws']],
  ['Aruba', ['Aruba', 'aw']],
  ['Mongolia', ['Mongolei', 'mn']],
  ['American Samoa', ['Amerikanisch-Samoa', 'as']],
  ['Bhutan', ['Bhutan', 'bt']],
  ['Macau', ['Macau', 'mo']],
  ['Brunei Darussalam', ['Brunei', 'bn']],
  ['São Tomé and Príncipe', ['São Tomé u. Príncipe', 'st']],
  ['Djibouti', ['Dschibuti', 'dj']],
  ['Cayman Islands', ['Kaimaninseln', 'ky']],
  ['Pakistan', ['Pakistan', 'pk']],
  ['Somalia', ['Somalia', 'so']],
  ['Tonga', ['Tonga', 'to']],
  ['Timor-Leste', ['Timor-Leste', 'tl']],
  ['Gibraltar', ['Gibraltar', 'gi']],
  ['Guam', ['Guam', 'gu']],
  ['Seychelles', ['Seychellen', 'sc']],
  ['Turks and Caicos Islands', ['Turks- und Caicosinseln', 'tc']],
  ['Liechtenstein', ['Liechtenstein', 'li']],
  ['Bahamas', ['Bahamas', 'bs']],
  ['US Virgin Islands', ['Amerik. Jungferninseln', 'vi']],
  ['British Virgin Islands', ['Brit. Jungferninseln', 'vg']],
  ['Anguilla', ['Anguilla', 'ai']],
  ['San Marino', ['San Marino', 'sm']],
])

interface RankingRow {
  rank: number
  englishName: string
  points: number
}

async function fetchHtml(): Promise<string> {
  console.log(`Fetching FIFA ranking from ${SOURCE_URL} …`)
  const res = await fetch(SOURCE_URL, { headers: { 'User-Agent': 'worldcup-2026-app/1.0' } })
  if (!res.ok) {
    console.error(`ERROR: ${res.status} ${res.statusText} fetching ${SOURCE_URL}`)
    process.exit(1)
  }
  const html = await res.text()
  console.log(`  Downloaded ${html.length.toLocaleString()} characters`)
  return html
}

/** Strip HTML tags, reapplying the regex until no more matches remain so that
 *  overlapping/nested markup (e.g. `<scr<script>ipt>`) can't survive a single pass. */
function stripTags(html: string): string {
  let stripped = html
  let previous: string
  do {
    previous = stripped
    stripped = stripped.replace(/<[^>]+>/g, '')
  } while (stripped !== previous)
  return stripped
}

/** Return [{rank, englishName, points}] for all 211 teams, rank-sorted. */
function parseRanking(html: string): RankingRow[] {
  // The page has multiple tables whose header starts with a "Rank" column
  // (a "Top 20" summary plus per-group standings tables) — the one we want
  // is the full 211-row table, so parse every candidate and keep the largest.
  let best: RankingRow[] = []
  let searchFrom = 0
  for (;;) {
    const start = html.indexOf('<th>Rank</th>', searchFrom)
    if (start === -1) break
    const end = html.indexOf('</table>', start)
    const tableEnd = end === -1 ? html.length : end
    const table = html.slice(start, tableEnd)
    searchFrom = end === -1 ? html.length : end + '</table>'.length

    const rows: RankingRow[] = []
    for (const m of table.matchAll(/<tr><td>(\d+)<\/td><td>(.*?)<\/td><td>([\d.]+)<\/td>/g)) {
      const [, rank, teamCell, points] = m as unknown as [string, string, string, string]
      const englishName = stripTags(teamCell).trim() // strip any <a> wrapper
      rows.push({ englishName, points: Number(points), rank: Number(rank) })
    }
    if (rows.length > best.length) best = rows
  }

  if (best.length === 0) {
    console.error('ERROR: could not find the ranking table on the page.')
    process.exit(1)
  }
  const rows = best

  rows.sort((a, b) => a.rank - b.rank)
  return rows
}

function emitTypescript(rows: RankingRow[], outPath: string): void {
  const lines = [
    "// The complete FIFA/Coca-Cola Men's World Ranking as published 11 June 2026 —",
    '// the last release before the 2026 World Cup. All 211 member associations in',
    '// rank order, with their ranking points.',
    '//',
    '// Generated by scripts/fetch-fifa-ranking.ts — do not edit by hand.',
    '//',
    '// This is the *same* snapshot that drives the group tiebreaker: the 48 World',
    '// Cup teams sit at exactly the positions stored as `fifaRanking` in `teams.ts`',
    '// (verified by `fifa-ranking.spec.ts`). Teams that play at the 2026 World Cup',
    '// are highlighted in the ranking view; participation is derived from `teams.ts`',
    '// (the single source of truth) by matching the `flagCode`, so the two data sets',
    '// can never silently drift apart.',
    '//',
    '// Source: https://www.whereig.com/football/fifa-world-rankings.html',
    '//',
    '// Country names are German; `flagCode` is the `flag-icons` CSS code.',
    '',
    'export interface RankingEntry {',
    '  /** Ranking position, 1 (best) … 211. */',
    '  rank: number',
    '  /** German country name. */',
    '  name: string',
    "  /** `flag-icons` CSS code, e.g. `'de'`, `'gb-eng'`. */",
    '  flagCode: string',
    '  /** FIFA ranking points for the 11 June 2026 release. */',
    '  points: number',
    '}',
    '',
    'export const fifaRanking: readonly RankingEntry[] = [',
  ]

  const missing: string[] = []
  for (const { rank, englishName, points } of rows) {
    const mapped = TEAM_MAP.get(englishName)
    if (mapped === undefined) {
      missing.push(englishName)
      continue
    }
    const [deName, flag] = mapped
    const name = deName.replaceAll('\\', '\\\\').replaceAll("'", "\\'")
    // Trim a trailing ".0" so e.g. 1326.0 reads 1326 (matches hand-edited style).
    const pts = points.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
    lines.push(`  { rank: ${rank}, name: '${name}', flagCode: '${flag}', points: ${pts} },`)
  }

  lines.push('] as const')
  lines.push('')

  if (missing.length > 0) {
    console.error(`ERROR: ${missing.length} team(s) missing from TEAM_MAP: ${JSON.stringify(missing)}`)
    process.exit(1)
  }

  const content = lines.join('\n')
  writeFileSync(outPath, content, 'utf-8')

  console.log(`\nWrote ${outPath}`)
  console.log(`  ${rows.length} teams, ${content.length.toLocaleString()} bytes`)
}

async function main(): Promise<void> {
  const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
  const outPath = join(repoRoot, 'src', 'data', 'fifa-ranking.ts')

  const rows = parseRanking(await fetchHtml())
  if (rows.length !== 211) {
    console.error(`WARNING: expected 211 teams, parsed ${rows.length}`)
  }

  emitTypescript(rows, outPath)
}

await main()
