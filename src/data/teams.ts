// The 48 teams of the 2026 FIFA World Cup, grouped A–L per the final draw
// (Washington, D.C., 5 December 2025) with the four inter-confederation and
// UEFA play-off slots resolved by the March 2026 play-off winners.
//
// `fifaRanking` is the FIFA/Coca-Cola Men's World Ranking position published
// 11 June 2026 (the last release before the tournament). It is used only as the
// deterministic last-resort group tiebreaker. See docs/tournament-rules.md.
//
// Sources:
//   - https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_draw
//   - https://en.wikipedia.org/wiki/2026_FIFA_World_Cup  (group tables)
//   - https://inside.fifa.com/fifa-world-ranking/men
//
// Team names are German (the only German strings in the data layer). Ids are
// the lower-case FIFA country code; `flagCode` is the `flag-icons` CSS code.

import type { Team } from '@/types/tournament'

export const teams: readonly Team[] = [
  { id: 'mex', name: 'Mexiko', flagCode: 'mx', group: 'A', fifaRanking: 14 },
  { id: 'rsa', name: 'Südafrika', flagCode: 'za', group: 'A', fifaRanking: 60 },
  { id: 'kor', name: 'Südkorea', flagCode: 'kr', group: 'A', fifaRanking: 25 },
  { id: 'cze', name: 'Tschechien', flagCode: 'cz', group: 'A', fifaRanking: 40 },
  { id: 'can', name: 'Kanada', flagCode: 'ca', group: 'B', fifaRanking: 30 },
  { id: 'bih', name: 'Bosnien und Herzegowina', flagCode: 'ba', group: 'B', fifaRanking: 64 },
  { id: 'qat', name: 'Katar', flagCode: 'qa', group: 'B', fifaRanking: 56 },
  { id: 'sui', name: 'Schweiz', flagCode: 'ch', group: 'B', fifaRanking: 19 },
  { id: 'bra', name: 'Brasilien', flagCode: 'br', group: 'C', fifaRanking: 6 },
  { id: 'mar', name: 'Marokko', flagCode: 'ma', group: 'C', fifaRanking: 7 },
  { id: 'hai', name: 'Haiti', flagCode: 'ht', group: 'C', fifaRanking: 83 },
  { id: 'sco', name: 'Schottland', flagCode: 'gb-sct', group: 'C', fifaRanking: 42 },
  { id: 'usa', name: 'USA', flagCode: 'us', group: 'D', fifaRanking: 17 },
  { id: 'par', name: 'Paraguay', flagCode: 'py', group: 'D', fifaRanking: 41 },
  { id: 'aus', name: 'Australien', flagCode: 'au', group: 'D', fifaRanking: 27 },
  { id: 'tur', name: 'Türkei', flagCode: 'tr', group: 'D', fifaRanking: 22 },
  { id: 'ger', name: 'Deutschland', flagCode: 'de', group: 'E', fifaRanking: 10 },
  { id: 'cuw', name: 'Curaçao', flagCode: 'cw', group: 'E', fifaRanking: 82 },
  { id: 'civ', name: 'Elfenbeinküste', flagCode: 'ci', group: 'E', fifaRanking: 33 },
  { id: 'ecu', name: 'Ecuador', flagCode: 'ec', group: 'E', fifaRanking: 23 },
  { id: 'ned', name: 'Niederlande', flagCode: 'nl', group: 'F', fifaRanking: 8 },
  { id: 'jpn', name: 'Japan', flagCode: 'jp', group: 'F', fifaRanking: 18 },
  { id: 'swe', name: 'Schweden', flagCode: 'se', group: 'F', fifaRanking: 38 },
  { id: 'tun', name: 'Tunesien', flagCode: 'tn', group: 'F', fifaRanking: 45 },
  { id: 'bel', name: 'Belgien', flagCode: 'be', group: 'G', fifaRanking: 9 },
  { id: 'egy', name: 'Ägypten', flagCode: 'eg', group: 'G', fifaRanking: 29 },
  { id: 'irn', name: 'Iran', flagCode: 'ir', group: 'G', fifaRanking: 20 },
  { id: 'nzl', name: 'Neuseeland', flagCode: 'nz', group: 'G', fifaRanking: 85 },
  { id: 'esp', name: 'Spanien', flagCode: 'es', group: 'H', fifaRanking: 2 },
  { id: 'cpv', name: 'Kap Verde', flagCode: 'cv', group: 'H', fifaRanking: 67 },
  { id: 'ksa', name: 'Saudi-Arabien', flagCode: 'sa', group: 'H', fifaRanking: 61 },
  { id: 'uru', name: 'Uruguay', flagCode: 'uy', group: 'H', fifaRanking: 16 },
  { id: 'fra', name: 'Frankreich', flagCode: 'fr', group: 'I', fifaRanking: 3 },
  { id: 'sen', name: 'Senegal', flagCode: 'sn', group: 'I', fifaRanking: 15 },
  { id: 'irq', name: 'Irak', flagCode: 'iq', group: 'I', fifaRanking: 57 },
  { id: 'nor', name: 'Norwegen', flagCode: 'no', group: 'I', fifaRanking: 31 },
  { id: 'arg', name: 'Argentinien', flagCode: 'ar', group: 'J', fifaRanking: 1 },
  { id: 'alg', name: 'Algerien', flagCode: 'dz', group: 'J', fifaRanking: 28 },
  { id: 'aut', name: 'Österreich', flagCode: 'at', group: 'J', fifaRanking: 24 },
  { id: 'jor', name: 'Jordanien', flagCode: 'jo', group: 'J', fifaRanking: 63 },
  { id: 'por', name: 'Portugal', flagCode: 'pt', group: 'K', fifaRanking: 5 },
  { id: 'cod', name: 'DR Kongo', flagCode: 'cd', group: 'K', fifaRanking: 46 },
  { id: 'uzb', name: 'Usbekistan', flagCode: 'uz', group: 'K', fifaRanking: 50 },
  { id: 'col', name: 'Kolumbien', flagCode: 'co', group: 'K', fifaRanking: 13 },
  { id: 'eng', name: 'England', flagCode: 'gb-eng', group: 'L', fifaRanking: 4 },
  { id: 'cro', name: 'Kroatien', flagCode: 'hr', group: 'L', fifaRanking: 11 },
  { id: 'gha', name: 'Ghana', flagCode: 'gh', group: 'L', fifaRanking: 73 },
  { id: 'pan', name: 'Panama', flagCode: 'pa', group: 'L', fifaRanking: 34 },
] as const

/** Quick lookup by team id. */
export const teamsById: ReadonlyMap<string, Team> = new Map(teams.map((t) => [t.id, t]))

/**
 * All teams in a given group, in the table order above. Returns a `readonly`
 * view: the elements are the shared singleton `Team` objects, so callers must
 * not mutate them (doing so would corrupt `teams`/`teamsById`).
 */
export function teamsInGroup(group: Team['group']): readonly Team[] {
  return teams.filter((t) => t.group === group)
}
