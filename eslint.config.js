import eslint from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import oxlint from 'eslint-plugin-oxlint'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', '.claude/**', 'playwright-report/**', 'test-results/**', 'dev-dist/**'],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  pluginVue.configs['flat/recommended'],
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

      // Enforce <script setup> API style throughout.
      'vue/component-api-style': ['error', ['script-setup']],

      // Macro call order: defineProps before defineEmits.
      'vue/define-macros-order': ['error', { order: ['defineProps', 'defineEmits'] }],

      // Require TypeScript type-based prop and emit declarations — consistent with
      // the TS-first approach and redundant with vue/require-default-prop: off.
      'vue/define-props-declaration': ['error', 'type-based'],
      'vue/define-emits-declaration': ['error', 'type-literal'],

      // Catch template refs that are declared but never read in <script setup>.
      'vue/no-unused-refs': 'error',

      // Enforce useTemplateRef() over ref<T | null>(null) for template refs.
      'vue/prefer-use-template-ref': 'error',

      // oxfmt owns HTML formatting; disable conflicting vue layout rules.
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',

      'vue/prefer-true-attribute-shorthand': 'error',

      // Block-size caps — thresholds are set ~15 lines above the post-refactor
      // maxima (script 84, template 116, style 134) to actively flag regressions
      // without requiring a change for every new line added.
      'vue/max-lines-per-block': ['error', { script: 100, template: 130, style: 150 }],
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      'vue/one-component-per-file': 'off',
    },
  },
  oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
)
