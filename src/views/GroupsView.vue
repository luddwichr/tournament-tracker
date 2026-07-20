<script setup lang="ts">
import { GROUP_IDS } from '../types/tournament'
import { GROUP_STANDINGS_COLUMNS } from '../components/stat-columns'
import GroupTable from '../components/GroupTable.vue'
import StatLegend from '../components/StatLegend.vue'
import ThirdPlaceTable from '../components/ThirdPlaceTable.vue'
import { computed } from 'vue'
import { rankThirdPlacedLive } from '../lib/third-place'
import { useTournamentStore } from '../stores/tournament'

const store = useTournamentStore()

const liveRanking = computed(() => rankThirdPlacedLive(store.results))
</script>

<template>
  <div class="groups-view">
    <h1 class="view-heading">Gruppen</h1>
    <!-- One legend for all twelve group tables, which share a column set —
         repeating it per card would be twelve identical disclosures. -->
    <StatLegend class="groups-view__legend" :columns="GROUP_STANDINGS_COLUMNS" />
    <div class="groups-view__grid">
      <GroupTable v-for="groupId in GROUP_IDS" :key="groupId" :group-id="groupId" />
      <ThirdPlaceTable class="groups-view__third-place" :live-ranking="liveRanking" />
    </div>
  </div>
</template>

<style scoped>
.groups-view__legend {
  display: block;
  margin-block-end: var(--space-4);
}

.groups-view__grid {
  display: grid;
  /* min(360px,100%) prevents the column from exceeding the container width on
     narrow viewports, avoiding a page-level horizontal scrollbar. */
  grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
  gap: var(--space-4);
}

.groups-view__third-place {
  grid-column: span 1;
}

/*
 * Sharing the grid (rather than a hardcoded max-width) means this tracks the
 * *actual* rendered column width, including the extra space 1fr columns pick
 * up on wide viewports — a static px estimate would run narrower than the
 * real group cards above it. Spans 2 tracks so a 12-row table doesn't stretch
 * across all 4 columns on wide screens.
 *
 * 49rem is where a second 360px column plus the gap first fits inside the
 * .app-main content box once its padding steps up to --space-5 at 640px
 * (2 × 360px + 16px gap + 2 × 24px padding = 784px = 49rem). Below that the
 * grid itself is down to a single column, so span 1 (full width) already
 * matches it — this only needs to widen, never explicitly narrow.
 */
@media (min-width: 49rem) {
  .groups-view__third-place {
    grid-column: span 2;
  }
}
</style>
