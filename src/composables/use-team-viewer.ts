import { ref, provide, inject } from 'vue'
import type { InjectionKey, Ref } from 'vue'
import type { Team } from '../types/tournament'

type OpenFn = (team: Team) => void

export const teamViewerKey: InjectionKey<OpenFn> = Symbol('team-viewer')

export interface TeamViewerState {
  team: Ref<Team | null>
  close: () => void
}

export function provideTeamViewer(): TeamViewerState {
  const team = ref<Team | null>(null)

  function open(t: Team): void {
    team.value = t
  }

  function close(): void {
    team.value = null
  }

  provide(teamViewerKey, open)

  return { close, team }
}

const noop: OpenFn = () => undefined

export function useTeamViewer(): OpenFn {
  return inject(teamViewerKey, noop)
}
