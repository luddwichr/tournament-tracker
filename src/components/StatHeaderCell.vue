<script setup lang="ts">
// Shared header cell for the stat tables (group standings, third-place,
// team stats): an abbreviated visible label plus a visually-hidden full
// label that screen readers announce. Pass `abbr` for the text variant, or
// provide the default slot for a visual (e.g. a card icon) instead.
defineProps<{ label: string; abbr?: string }>()
</script>

<template>
  <th scope="col">
    <abbr v-if="abbr" :title="label">{{ abbr }}</abbr>
    <slot v-else />
    <span class="visually-hidden">{{ label }}</span>
  </th>
</template>
