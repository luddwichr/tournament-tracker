<script setup lang="ts">
import type { Team, Player } from '../types/tournament'
import TeamFlag from './TeamFlag.vue'
import SquadList from './SquadList.vue'
import BaseDialog from './BaseDialog.vue'

defineProps<{
  team: Team
  players: Player[]
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <BaseDialog
    :aria-label="`Kader: ${team.name}`"
    max-width="min(92vw, 32rem)"
    max-height="min(90vh, 40rem)"
    @close="emit('close')"
  >
    <template #title>
      <div class="squad-dialog__team-heading">
        <TeamFlag :flag-code="team.flagCode" :name="team.name" decorative size="2rem" />
        <div>
          <h2 class="squad-dialog__title">
            {{ team.name }}
          </h2>
          <p class="squad-dialog__ranking">FIFA-Ranking: {{ team.fifaRanking }}</p>
        </div>
      </div>
    </template>

    <SquadList :players="players" />
  </BaseDialog>
</template>

<style scoped>
.squad-dialog__team-heading {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.squad-dialog__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
  line-height: 1.2;
}

.squad-dialog__ranking {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
</style>
