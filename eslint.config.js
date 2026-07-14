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
  tseslint.configs.strictTypeChecked,
  pluginVue.configs['flat/recommended'],
  pluginVueA11y.configs['flat/recommended'],
  {
    files: ['**/*.ts', '**/*.vue'],
    languageOptions: {
      parserOptions: {
        extraFileExtensions: ['.vue'],
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // in this repo it is fine to use implicit stringification on non-string values
      '@typescript-eslint/restrict-template-expressions': 'off',
      // TypeScript's compiler already catches undefined references;
      // no-undef from eslint/recommended is redundant and flags DOM globals.
      'no-undef': 'off',
    },
  },
  {
    extends: [tseslint.configs.disableTypeChecked],
    // Plain JS files (this config, hooks, build scripts) have no tsconfig
    // project; typed rules would error on them.
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
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
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-emits-declaration': ['error', 'type-literal'],
      'vue/define-macros-order': ['error', { order: ['defineProps', 'defineEmits'] }],
      'vue/define-props-declaration': ['error', 'type-based'],
      // oxfmt owns HTML formatting; disable conflicting vue layout rules
      // (the html-* / max-attributes-per-line group here and
      // singleline-html-element-content-newline further down).
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-indent': 'off',
      'vue/html-self-closing': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/no-unused-refs': 'error',
      'vue/prefer-true-attribute-shorthand': 'error',
      'vue/prefer-use-template-ref': 'error',
      // TypeScript's `?` already communicates optionality; explicit defaults are
      // only needed when Vue's boolean-casting behaviour requires one (handled
      // case-by-case with withDefaults).
      'vue/require-default-prop': 'off',
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
  {
    // typescript-eslint runs plain tsc, which cannot resolve `.vue` module
    // types (vue-tsc owns that; `npm run typecheck` covers it). Every SFC
    // import — template refs, mount() in specs, createApp(App) — therefore
    // surfaces as `any`/error-typed and would trip the no-unsafe-* family
    // with false positives. All other typed rules stay active here.
    files: ['**/*.vue', 'src/**/*.spec.ts', 'src/main.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      // `expect(obj.method).toHaveBeenCalled()` on a vi.fn/spy never invokes
      // the method, so no `this` scoping issue exists — a known false
      // positive of unbound-method in vitest/jest assertions.
      '@typescript-eslint/unbound-method': 'off',
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
