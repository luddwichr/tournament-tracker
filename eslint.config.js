import boundaries from 'eslint-plugin-boundaries'
import eslint from '@eslint/js'
import { fileURLToPath } from 'node:url'
import globals from 'globals'
import { includeIgnoreFile } from 'eslint/config'
import oxlint from 'eslint-plugin-oxlint'
import pluginVue from 'eslint-plugin-vue'
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility'
import sonarjs from 'eslint-plugin-sonarjs'
import tseslint from 'typescript-eslint'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))

export default tseslint.config(
  includeIgnoreFile(gitignorePath),
  eslint.configs.recommended,
  sonarjs.configs.recommended,
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
      // This project deliberately relies on default (code-unit) ordering for deterministic branded keys.
      // e.g. `ThirdPlaceKey` is the sorted-join of group letters, and `pairKey` is an order-independent team-pair key.
      // A locale-aware compare would be semantically wrong there.
      // every other flagged sort is over short ASCII strings where the default order is already correct.
      // The rule's real value (catching numeric `.sort()` bugs) does not apply to any sort in this codebase.
      'sonarjs/no-alphabetical-sort': 'off',
    },
  },
  {
    extends: [tseslint.configs.disableTypeChecked],
    // Plain JS files (this config, hooks, build scripts) have no tsconfig project; typed rules would error on them.
    files: ['**/*.js'],
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
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-emits-declaration': ['error', 'type-literal'],
      'vue/define-macros-order': ['error', { order: ['defineProps', 'defineEmits'] }],
      'vue/define-props-declaration': ['error', 'type-based'],
      'vue/define-props-destructuring': 'error',
      'vue/enforce-style-attribute': ['error', { allow: ['scoped'] }],
      // oxfmt owns HTML formatting; disable conflicting vue layout rules.
      // (the html-* / max-attributes-per-line group here and singleline-html-element-content-newline further down).
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-indent': 'off',
      'vue/html-self-closing': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/no-negated-v-if-condition': 'error',
      'vue/no-ref-object-reactivity-loss': 'error',
      'vue/no-setup-props-reactivity-loss': 'error',
      'vue/no-unused-emit-declarations': 'error',
      'vue/no-unused-properties': 'error',
      'vue/no-unused-refs': 'error',
      'vue/prefer-true-attribute-shorthand': 'error',
      'vue/prefer-use-template-ref': 'error',
      'vue/prefer-v-model': 'error',
      // TypeScript's `?` already communicates optionality.
      // explicit defaults are only needed when Vue's boolean-casting behaviour requires one (handled case-by-case with withDefaults).
      'vue/require-default-prop': 'off',
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
  {
    // typescript-eslint runs plain tsc, which cannot resolve `.vue` module types
    // (vue-tsc owns that; `npm run typecheck` covers it).
    // Every SFC import therefore surfaces as `any` or error-typed and would trip the no-unsafe-* family with false
    // positives.
    // That covers template refs, mount() in specs and createApp(App).
    // All other typed rules stay active here.
    files: ['**/*.vue', 'src/**/*.spec.ts', 'src/app/main.ts'],
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
      // `expect(obj.method).toHaveBeenCalled()` on a vi.fn/spy never invokes the method,
      // so no `this` scoping issue exists.
      // This is a known false positive of unbound-method in vitest and jest assertions.
      '@typescript-eslint/unbound-method': 'off',
      'sonarjs/parameterized-tests': 'off',
      'vue/one-component-per-file': 'off',
    },
  },
  {
    files: ['.claude/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Local dev tooling (statusline hook) shells out to fixed, trusted commands like `git`.
      // The PATH-hardening rule guards binaries invoked on untrusted input, which these are not.
      'sonarjs/no-os-command-from-path': 'off',
    },
  },
  {
    // One-off maintenance scripts (FIFA-ranking / squad fetchers) parse remote HTML and wikitext.
    // The Wikipedia source is publicly editable, so this is untrusted input.
    // It's still not a ReDoS concern: none of the flagged patterns nest quantifiers, so the worst case is quadratic rather than catastrophic.
    // And, these run by hand at dev time with no service behind them.
    // A hostile edit costs a maintainer one Ctrl-C.
    files: ['scripts/**/*.ts'],
    rules: {
      'sonarjs/super-linear-regex': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,vue}', 'e2e/**/*.ts'],
    plugins: { boundaries },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          // Every policy below is an `allow`, so they union and the order is irrelevant.
          // If a `disallow` is ever added it must come *after* any allow it overrides.
          // The rule is last-match-wins, not first.
          policies: [
            // Unit tests may reach into any production layer plus shared support, but never into e2e.
            {
              allow: { to: { element: { types: { anyOf: ['domain', 'ui', 'app-root', 'test-support'] } } } },
              from: { file: { categories: 'unit-test' } },
            },
            // Shared test helpers stay pure: domain only.
            // No self-allow is needed, because patterns without a capture group are a single element.
            // Imports within one element are never reported.
            // Contrast `domain` below.
            {
              allow: { to: { element: { types: 'domain' } } },
              from: { element: { types: 'test-support' } },
            },
            // e2e exercises the app through the browser: only the pure domain layer (types/data/lib) and shared test-support, never UI/runtime.
            {
              allow: { to: { element: { types: { anyOf: ['domain', 'test-support'] } } } },
              from: { element: { types: 'e2e' } },
            },
            // Production code may only import production code, never test-support, specs or e2e.
            // That keeps test helpers out of the shipped bundle.
            // The capture group splits `domain` into three elements (types/data/lib), so the self-allow here is load-bearing: it permits lib -> data.
            {
              allow: { to: { element: { types: 'domain' } } },
              from: { element: { types: 'domain' } },
            },
            // `styles` is a leaf: stylesheets are imported by the app entry and by the components that need them, and import nothing back.
            {
              allow: { to: { element: { types: { anyOf: ['domain', 'ui', 'app-root', 'styles'] } } } },
              from: { element: { types: { anyOf: ['ui', 'app-root'] } } },
            },
          ],
        },
      ],
      // Every linted file must land in an element.
      // Without this, a file matching no element would simply be unchecked.
      'boundaries/no-unknown-files': 'error',
    },
    settings: {
      // Architectural layer, matched by folder.
      // Every pattern names a real folder and they are mutually exclusive, so classification does not depend on the order.
      // Nothing is a catch-all: `src` has no loose root files, so a new top-level folder matches nothing and `no-unknown-files` above reject it.
      // This enforces a deliberate choice of layer instead of silently granting it app-layer import rights.
      'boundaries/elements': [
        { pattern: 'src/test-support', type: 'test-support' },
        { pattern: 'src/(types|data|lib)', type: 'domain' },
        { pattern: 'src/(components|views|stores|composables)', type: 'ui' },
        { pattern: 'src/app', type: 'app-root' },
        { pattern: 'src/styles', type: 'styles' },
        { pattern: 'src/build', type: 'build' },
        { pattern: 'e2e', type: 'e2e' },
      ],
      // Orthogonal file dimension: a `.spec.ts` is a unit test regardless of which layer folder it sits in.
      // Scoped to src so e2e specs stay purely  `e2e` and never inherit the unit-test import allowances above.
      'boundaries/files': [{ category: 'unit-test', pattern: 'src/**/*.spec.ts' }],
      // bboundaries resolves each import to a file before classifying it, and the node resolver's default extensions cover neither.
      // `.ts` is what this project imports extensionlessly.
      // `.vue` specifiers carry their own extension but are listed so resolution does not rely on that.
      'import/resolver': {
        node: { extensions: ['.ts', '.vue'] },
      },
    },
  },
  oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
)
