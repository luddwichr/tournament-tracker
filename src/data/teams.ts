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

import { GROUP_IDS } from '../types/tournament'
import type { Team } from '../types/tournament'

export const teams = [
  { fifaRanking: 14, flagCode: 'mx', group: 'A', id: 'mex', name: 'Mexiko' },
  { fifaRanking: 60, flagCode: 'za', group: 'A', id: 'rsa', name: 'Südafrika' },
  { fifaRanking: 25, flagCode: 'kr', group: 'A', id: 'kor', name: 'Südkorea' },
  { fifaRanking: 40, flagCode: 'cz', group: 'A', id: 'cze', name: 'Tschechien' },
  { fifaRanking: 30, flagCode: 'ca', group: 'B', id: 'can', name: 'Kanada' },
  { fifaRanking: 64, flagCode: 'ba', group: 'B', id: 'bih', name: 'Bosnien H.' },
  { fifaRanking: 56, flagCode: 'qa', group: 'B', id: 'qat', name: 'Katar' },
  { fifaRanking: 19, flagCode: 'ch', group: 'B', id: 'sui', name: 'Schweiz' },
  { fifaRanking: 6, flagCode: 'br', group: 'C', id: 'bra', name: 'Brasilien' },
  { fifaRanking: 7, flagCode: 'ma', group: 'C', id: 'mar', name: 'Marokko' },
  { fifaRanking: 83, flagCode: 'ht', group: 'C', id: 'hai', name: 'Haiti' },
  { fifaRanking: 42, flagCode: 'gb-sct', group: 'C', id: 'sco', name: 'Schottland' },
  { fifaRanking: 17, flagCode: 'us', group: 'D', id: 'usa', name: 'USA' },
  { fifaRanking: 41, flagCode: 'py', group: 'D', id: 'par', name: 'Paraguay' },
  { fifaRanking: 27, flagCode: 'au', group: 'D', id: 'aus', name: 'Australien' },
  { fifaRanking: 22, flagCode: 'tr', group: 'D', id: 'tur', name: 'Türkei' },
  { fifaRanking: 10, flagCode: 'de', group: 'E', id: 'ger', name: 'Deutschland' },
  { fifaRanking: 82, flagCode: 'cw', group: 'E', id: 'cuw', name: 'Curaçao' },
  { fifaRanking: 33, flagCode: 'ci', group: 'E', id: 'civ', name: 'Elfenbeinküste' },
  { fifaRanking: 23, flagCode: 'ec', group: 'E', id: 'ecu', name: 'Ecuador' },
  { fifaRanking: 8, flagCode: 'nl', group: 'F', id: 'ned', name: 'Niederlande' },
  { fifaRanking: 18, flagCode: 'jp', group: 'F', id: 'jpn', name: 'Japan' },
  { fifaRanking: 38, flagCode: 'se', group: 'F', id: 'swe', name: 'Schweden' },
  { fifaRanking: 45, flagCode: 'tn', group: 'F', id: 'tun', name: 'Tunesien' },
  { fifaRanking: 9, flagCode: 'be', group: 'G', id: 'bel', name: 'Belgien' },
  { fifaRanking: 29, flagCode: 'eg', group: 'G', id: 'egy', name: 'Ägypten' },
  { fifaRanking: 20, flagCode: 'ir', group: 'G', id: 'irn', name: 'Iran' },
  { fifaRanking: 85, flagCode: 'nz', group: 'G', id: 'nzl', name: 'Neuseeland' },
  { fifaRanking: 2, flagCode: 'es', group: 'H', id: 'esp', name: 'Spanien' },
  { fifaRanking: 67, flagCode: 'cv', group: 'H', id: 'cpv', name: 'Kap Verde' },
  { fifaRanking: 61, flagCode: 'sa', group: 'H', id: 'ksa', name: 'Saudi-Arabien' },
  { fifaRanking: 16, flagCode: 'uy', group: 'H', id: 'uru', name: 'Uruguay' },
  { fifaRanking: 3, flagCode: 'fr', group: 'I', id: 'fra', name: 'Frankreich' },
  { fifaRanking: 15, flagCode: 'sn', group: 'I', id: 'sen', name: 'Senegal' },
  { fifaRanking: 57, flagCode: 'iq', group: 'I', id: 'irq', name: 'Irak' },
  { fifaRanking: 31, flagCode: 'no', group: 'I', id: 'nor', name: 'Norwegen' },
  { fifaRanking: 1, flagCode: 'ar', group: 'J', id: 'arg', name: 'Argentinien' },
  { fifaRanking: 28, flagCode: 'dz', group: 'J', id: 'alg', name: 'Algerien' },
  { fifaRanking: 24, flagCode: 'at', group: 'J', id: 'aut', name: 'Österreich' },
  { fifaRanking: 63, flagCode: 'jo', group: 'J', id: 'jor', name: 'Jordanien' },
  { fifaRanking: 5, flagCode: 'pt', group: 'K', id: 'por', name: 'Portugal' },
  { fifaRanking: 46, flagCode: 'cd', group: 'K', id: 'cod', name: 'DR Kongo' },
  { fifaRanking: 50, flagCode: 'uz', group: 'K', id: 'uzb', name: 'Usbekistan' },
  { fifaRanking: 13, flagCode: 'co', group: 'K', id: 'col', name: 'Kolumbien' },
  { fifaRanking: 4, flagCode: 'gb-eng', group: 'L', id: 'eng', name: 'England' },
  { fifaRanking: 11, flagCode: 'hr', group: 'L', id: 'cro', name: 'Kroatien' },
  { fifaRanking: 73, flagCode: 'gh', group: 'L', id: 'gha', name: 'Ghana' },
  { fifaRanking: 34, flagCode: 'pa', group: 'L', id: 'pan', name: 'Panama' },
] as const satisfies readonly Team[]

/** Union of all 48 literal team id strings. */
export type TeamId = (typeof teams)[number]['id']

/**
 * Quick lookup by team id. Keyed by plain `string` (not `TeamId`): callers
 * look this up with ids coming from `TeamRef.teamId`, which is runtime data
 * (parsed match fixtures / results-sync input), not a compile-time literal,
 * so a narrower key type would only force casts without adding real safety.
 */
export const teamsById: ReadonlyMap<string, Team> = new Map(teams.map((t) => [t.id, t]))

/** Teams grouped by their `group`, precomputed once to back `teamsInGroup`. */
const teamsByGroup: ReadonlyMap<Team['group'], readonly Team[]> = new Map(
  GROUP_IDS.map((group) => [group, teams.filter((t) => t.group === group)]),
)

/**
 * All teams in a given group, in the table order above. Returns a `readonly`
 * view: the elements are the shared singleton `Team` objects, so callers must
 * not mutate them (doing so would corrupt `teams`/`teamsById`).
 */
export function teamsInGroup(group: Team['group']): readonly Team[] {
  return teamsByGroup.get(group) ?? []
}
