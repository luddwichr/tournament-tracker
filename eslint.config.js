import { fileURLToPath } from 'node:url'
import eslint from '@eslint/js'
import { includeIgnoreFile } from 'eslint/config'
import pluginVue from 'eslint-plugin-vue'
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility'
import oxlint from 'eslint-plugin-oxlint'
import tseslint from 'typescript-eslint'
import globals from 'globals'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))

export default tseslint.config(
  includeIgnoreFile(gitignorePath),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  pluginVue.configs['flat/recommended'],
  pluginVueA11y.configs['flat/recommended'],
  {
    files: ['**/*.ts', '**/*.vue'],
    // TypeScript's compiler already catches undefined references;
    // no-undef from eslint/recommended is redundant and flags DOM globals.
    rules: {
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      // TypeScript's `?` already communicates optionality; explicit defaults are
      // only needed when Vue's boolean-casting behaviour requires one (handled
      // case-by-case with withDefaults).
      'vue/require-default-prop': 'off',
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-macros-order': ['error', { order: ['defineProps', 'defineEmits'] }],
      'vue/define-props-declaration': ['error', 'type-based'],
      'vue/define-emits-declaration': ['error', 'type-literal'],
      'vue/no-unused-refs': 'error',
      'vue/prefer-use-template-ref': 'error',
      'vue/prefer-true-attribute-shorthand': 'error',

      // oxfmt owns HTML formatting; disable conflicting vue layout rules.
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      'vue/one-component-per-file': 'off',
    },
  },
  {
    files: ['.claude/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
)
