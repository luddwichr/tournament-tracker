import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePossibleTeamsDialog } from './use-possible-teams-dialog'
import { useTournamentStore } from '../stores/tournament'
import { resolveTeamRef } from '../lib/knockout'
import { groupMatches } from '../data/fixtures-2026'
import { makeResult } from '../test-support/results'
import { makeMatch } from '../test-support/matches'

// ---------------------------------------------------------------------------
// usePossibleTeamsDialog — `label` computed
// ---------------------------------------------------------------------------
//
// PossibleTeamsDialog.spec.ts only mounts the presentational component with
// a `label` prop supplied directly, so it never exercises the composable's
// own `label` computed — in particular its fallback to `teamRefLabel()`
// (src/lib/bracket-labels.ts) while `resolveTeamRef` can't yet determine a
// concrete team from `store.results`.

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

    // No results entered yet — group A isn't complete, so resolveTeamRef
    // returns null and label must fall back to the ref's placeholder text.
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
