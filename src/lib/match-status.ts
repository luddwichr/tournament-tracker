export type MatchStatus = 'upcoming' | 'live' | 'finished'

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  upcoming: 'geplant',
  live: 'läuft',
  finished: 'beendet',
}

export function getMatchStatus(kickoff: string, hasResult: boolean): MatchStatus {
  if (hasResult) return 'finished'
  return Date.now() >= new Date(kickoff).getTime() ? 'live' : 'upcoming'
}
