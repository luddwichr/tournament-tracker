<script setup lang="ts">
import { GROUP_IDS } from '../types/tournament'
import GroupTable from '../components/GroupTable.vue'
</script>

<template>
  <div class="groups-view">
    <h1 class="groups-view__heading">Gruppen</h1>
    <div class="groups-view__grid">
      <GroupTable v-for="groupId in GROUP_IDS" :key="groupId" :group-id="groupId" />
    </div>
  </div>
</template>

<style scoped>
.groups-view__heading {
  margin: 0 0 var(--space-4);
  font-size: var(--font-size-xl);
}

.groups-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: var(--space-4);
}
</style>
