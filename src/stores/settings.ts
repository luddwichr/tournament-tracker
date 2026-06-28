import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Theme = 'light' | 'dark'

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const theme = ref<Theme>('light')
    return { theme }
  },
  { persist: true },
)
