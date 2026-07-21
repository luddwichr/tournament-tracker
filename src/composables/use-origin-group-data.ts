import { type ComputedRef, computed } from 'vue'
import type { GroupId, ThirdPlaceSlot } from '../types/tournament'
import type { OriginGroupData, OriginTeamRow } from '../components/OriginColumn.vue'
import { type RefKey, refKeyFor } from '../lib/bracket-graph'
import { buildGroupToThirdPlaceSlotMap, rankThirdPlaced } from '../lib/third-place'
import { GROUP_IDS } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'

/**
 * Build the `OriginColumn` `groupData` prop from the store's shared `standingsByGroup` getter.
 * That is the per-group top-3 rows with their bracket `refKey`, either groupRank or thirdPlace, and elimination flag.
 *
 * `BracketView` remains the store-connected container, this is just where the derivation is expressed.
 */
export function useOriginGroupData(): ComputedRef<OriginGroupData[]> {
  const store = useTournamentStore()

  const rankedThirds = computed(() => rankThirdPlaced(store.results))
  const allGroupsComplete = computed(() => rankedThirds.value !== null)

  const thirdPlaceGroupToSlot = computed((): Map<GroupId, ThirdPlaceSlot> => {
    const ranked = rankedThirds.value
    return ranked ? buildGroupToThirdPlaceSlotMap(ranked) : new Map<GroupId, ThirdPlaceSlot>()
  })

  return computed((): OriginGroupData[] =>
    GROUP_IDS.map((id: GroupId) => {
      const standings = store.standingsByGroup.get(id) ?? []
      const r3Slot = thirdPlaceGroupToSlot.value.get(id) ?? null

      const teams: OriginTeamRow[] = standings.slice(0, 3).map((stat, i) => {
        const rank = i + 1
        let refKey: RefKey | null
        if (rank === 1 || rank === 2) refKey = refKeyFor({ group: id, kind: 'groupRank', rank })
        else refKey = r3Slot != null ? refKeyFor({ kind: 'thirdPlace', slot: r3Slot }) : null

        return {
          eliminated: rank === 3 && allGroupsComplete.value && r3Slot == null,
          rank,
          refKey,
          team: stat.team,
        }
      })

      return { id, teams }
    }),
  )
}
