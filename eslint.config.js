import { globalIgnores } from 'eslint/config'
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,vue}'],
  },

  globalIgnores([
    '**/dist/**',
    '**/dev-dist/**',
    '**/node_modules/**',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/coverage/**',
  ]),

  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  ...pluginVueA11y.configs['flat/recommended'],
  skipFormatting,
)
