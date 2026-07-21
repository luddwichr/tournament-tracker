import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { groupMatches } from '../data/fixtures-2026'
import { makeMatch } from '../test-support/matches'
import { makeResult } from '../test-support/results'
import { resolveTeamRef } from '../lib/knockout'
import { usePossibleTeamsDialog } from './use-possible-teams-dialog'
import { useTournamentStore } from '../stores/tournament'

// PossibleTeamsDialog.spec.ts only mounts the presentational component with a `label` prop supplied directly.
// So it never exercises the composable's own `label` computed.
// In particular it never covers the fallback to `teamRefLabel()` in src/lib/bracket-labels.ts.
// That fallback applies while `resolveTeamRef` can't yet determine a concrete team from `store.results`.

describe('usePossibleTeamsDialog — label', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('is an empty string when nothing is open', () => {
    const { label } = usePossibleTeamsDialog()
    expect(label.value).toBe('')
  })

  it("falls back to teamRefLabel's placeholder while the ref is unresolved", () => {
    const { label, open } = usePossibleTeamsDialog()
    const match = makeMatch({ homeRef: { group: 'A', kind: 'groupRank', rank: 1 } })

    open(match, 'home')

    // No results have been entered yet, so group A isn't complete.
    // resolveTeamRef therefore returns null and label must fall back to the ref's placeholder text.
    expect(label.value).toBe('Sieger Gruppe A')
  })

  it('shows the resolved team name once results resolve the ref', () => {
    const store = useTournamentStore()
    groupMatches
      .filter((m) => m.group === 'A')
      .forEach((m) => {
        store.enterResult(makeResult(m.id, 1, 0))
      })

    const { label, open } = usePossibleTeamsDialog()
    const match = makeMatch({ homeRef: { group: 'A', kind: 'groupRank', rank: 1 } })

    open(match, 'home')

    const resolved = resolveTeamRef({ group: 'A', kind: 'groupRank', rank: 1 }, store.results)
    expect(resolved).not.toBeNull()
    expect(label.value).toBe(resolved!.name)
    // Confirms it's the resolved team, not the unresolved-ref placeholder.
    expect(label.value).not.toBe('Sieger Gruppe A')
  })
})
