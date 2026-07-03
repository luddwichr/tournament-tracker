<script setup lang="ts">
import type { Theme } from '../stores/settings'

defineProps<{ modelValue: Theme }>()
const emit = defineEmits<{ 'update:modelValue': [value: Theme] }>()

const themes: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Hell', icon: '☀️' },
  { value: 'dark', label: 'Dunkel', icon: '🌙' },
]
</script>

<template>
  <fieldset class="theme-picker">
    <legend class="visually-hidden">Design</legend>
    <div class="theme-picker__options" role="group">
      <label
        v-for="t in themes"
        :key="t.value"
        :for="`theme-picker-${t.value}`"
        class="theme-picker__option"
        :class="{ 'theme-picker__option--active': modelValue === t.value }"
      >
        <input
          :id="`theme-picker-${t.value}`"
          type="radio"
          name="theme"
          :value="t.value"
          :checked="modelValue === t.value"
          class="visually-hidden"
          @change="emit('update:modelValue', t.value)"
        />
        <span aria-hidden="true">{{ t.icon }}</span>
        {{ t.label }}
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.theme-picker {
  border: none;
  padding: 0;
  margin: 0;
}

.theme-picker__options {
  display: flex;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.theme-picker__option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--tap-target);
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  border-inline-end: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  transition:
    background var(--motion-duration-base) var(--motion-easing-standard),
    color var(--motion-duration-base) var(--motion-easing-standard);
}

.theme-picker__option:last-child {
  border-inline-end: none;
}

.theme-picker__option--active {
  background: var(--color-primary);
  color: var(--color-primary-contrast);
}

.theme-picker__option:has(:focus-visible) {
  outline: 3px solid var(--color-focus);
  outline-offset: -3px;
}

.theme-picker__option:hover:not(.theme-picker__option--active) {
  background: var(--color-bg);
  color: var(--color-text);
}
</style>
