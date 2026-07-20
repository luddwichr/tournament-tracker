/**
 * Column definitions for the stat tables, shared by each table's header row
 * and by the StatLegend that expands the abbreviations. Keeping both off one
 * list is the point: a renamed column cannot drift out of sync with the
 * legend explaining it.
 */
export interface StatColumn {
  /** Visible abbreviation, e.g. `Sp`. Also the legend's term. */
  readonly abbr: string
  /** Full German word, announced to screen readers and shown in the legend. */
  readonly label: string
}

export const GROUP_STANDINGS_COLUMNS: readonly StatColumn[] = [
  { abbr: 'Sp', label: 'Spiele' },
  { abbr: 'S', label: 'Siege' },
  { abbr: 'U', label: 'Unentschieden' },
  { abbr: 'N', label: 'Niederlagen' },
  { abbr: 'T+', label: 'Tore' },
  { abbr: 'T-', label: 'Gegentore' },
  { abbr: 'TD', label: 'Tordifferenz' },
  { abbr: 'Pkt', label: 'Punkte' },
]

export const THIRD_PLACE_COLUMNS: readonly StatColumn[] = [
  { abbr: 'Pkt', label: 'Punkte' },
  { abbr: 'TD', label: 'Tordifferenz' },
  { abbr: 'Tore', label: 'Erzielte Tore' },
  { abbr: 'FP', label: 'Fair-Play-Punkte' },
  { abbr: 'FIFA', label: 'FIFA-Weltrangliste' },
]

export const TEAM_STATS_COLUMNS: readonly StatColumn[] = [
  { abbr: 'Sp', label: 'Spiele' },
  { abbr: 'S', label: 'Siege' },
  { abbr: 'U', label: 'Unentschieden' },
  { abbr: 'N', label: 'Niederlagen' },
  { abbr: 'T+', label: 'Tore' },
  { abbr: 'T-', label: 'Gegentore' },
]

/**
 * The two card columns render as icons rather than text, so they carry no
 * abbreviation in the header — the legend names them with the emoji the app
 * already uses elsewhere.
 */
export const TEAM_STATS_CARD_LEGEND: readonly StatColumn[] = [
  { abbr: '🟨', label: 'Gelbe Karten' },
  { abbr: '🟥', label: 'Rote Karten' },
]
