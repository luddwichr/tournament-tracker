<script setup lang="ts">
import { GROUP_IDS } from '../types/tournament'
import GroupTable from '../components/GroupTable.vue'
</script>

<template>
  <div class="groups-view">
    <h1 class="groups-view__heading">
      Gruppen
    </h1>
    <div class="groups-view__grid">
      <GroupTable
        v-for="groupId in GROUP_IDS"
        :key="groupId"
        :group-id="groupId"
      />
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
</style>
