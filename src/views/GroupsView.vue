<script setup lang="ts">
import { GROUP_IDS } from '../types/tournament'
import GroupTable from '../components/GroupTable.vue'
import ThirdPlaceTable from '../components/ThirdPlaceTable.vue'
</script>

<template>
  <div class="groups-view">
    <h1 class="groups-view__heading">Gruppen</h1>
    <div class="groups-view__grid">
      <GroupTable v-for="groupId in GROUP_IDS" :key="groupId" :group-id="groupId" />
      <ThirdPlaceTable class="groups-view__third-place" />
    </div>
  </div>
</template>

<style scoped>
.groups-view__heading {
  margin: 0 0 var(--space-4);
  font-size: var(--font-size-lg);
  font-weight: 700;
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
