<script setup lang="ts">
import { ref, computed, useId } from 'vue'
import type { Team } from '../types/tournament'
import TeamFlag from './TeamFlag.vue'
import SquadList from './SquadList.vue'
import TeamStats from './TeamStats.vue'
import TeamSchedule from './TeamSchedule.vue'
import BaseDialog from './BaseDialog.vue'
import TeamIcon from './icons/TeamIcon.vue'
import ScheduleIcon from './icons/ScheduleIcon.vue'
import { useTournamentStore } from '../stores/tournament'
import { matchesForTeam, computeTeamStats } from '../lib/team-schedule'
import { squads } from '../data/squads'

const props = defineProps<{
  team: Team
}>()

const emit = defineEmits<{ close: [] }>()

const store = useTournamentStore()
const players = computed(() => squads[props.team.id] ?? [])
const entries = computed(() => matchesForTeam(props.team, store.results))
const stats = computed(() => computeTeamStats(props.team, entries.value))

type TabId = 'team' | 'schedule'
const tabs: { id: TabId; label: string }[] = [
  { id: 'team', label: 'Team' },
  { id: 'schedule', label: 'Spielplan' },
]
const activeTab = ref<TabId>('team')
const tabIds = tabs.map(() => useId())
</script>

<template>
  <BaseDialog :aria-label="team.name" max-width="min(92vw, 32rem)" max-height="min(90vh, 40rem)" @close="emit('close')">
    <template #title>
      <div class="team-dialog__team-heading">
        <TeamFlag :flag-code="team.flagCode" size="2rem" />
        <div>
          <h2 class="team-dialog__title">
            {{ team.name }}
          </h2>
          <p class="team-dialog__ranking">FIFA-Ranking: {{ team.fifaRanking }}</p>
        </div>
      </div>
    </template>

    <div class="team-dialog__tabs" role="tablist" aria-label="Ansicht">
      <button
        v-for="(tab, index) in tabs"
        :id="`${tabIds[index]}-tab`"
        :key="tab.id"
        type="button"
        role="tab"
        class="team-dialog__tab"
        :class="{ 'team-dialog__tab--active': activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`${tabIds[index]}-panel`"
        :tabindex="activeTab === tab.id ? 0 : -1"
        @click="activeTab = tab.id"
      >
        <TeamIcon v-if="tab.id === 'team'" class="team-dialog__tab-icon" />
        <ScheduleIcon v-else class="team-dialog__tab-icon" />
        {{ tab.label }}
      </button>
    </div>

    <div
      v-show="activeTab === 'team'"
      :id="`${tabIds[0]}-panel`"
      role="tabpanel"
      :aria-labelledby="`${tabIds[0]}-tab`"
      class="team-dialog__panel"
    >
      <TeamStats :stats="stats" />
      <SquadList :players="players" />
    </div>

    <div
      v-show="activeTab === 'schedule'"
      :id="`${tabIds[1]}-panel`"
      role="tabpanel"
      :aria-labelledby="`${tabIds[1]}-tab`"
      class="team-dialog__panel"
    >
      <TeamSchedule :entries="entries" />
    </div>
  </BaseDialog>
</template>

<style scoped>
.team-dialog__team-heading {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.team-dialog__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
  line-height: 1.2;
}

.team-dialog__ranking {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.team-dialog__tabs {
  display: flex;
  gap: var(--space-2);
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.team-dialog__tab {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  margin-bottom: -1px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font: inherit;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
}

.team-dialog__tab:hover {
  color: var(--color-text);
}

.team-dialog__tab--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.team-dialog__tab-icon {
  width: 1.1em;
  height: 1.1em;
  flex-shrink: 0;
}

.team-dialog__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4) var(--space-4);
}
</style>
