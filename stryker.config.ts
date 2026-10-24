// Stryker only auto-discovers .json, .js, .mjs and .cjs configs.
// `npm run test:mutation` passes this file explicitly, and Node strips the types natively when Stryker imports it.
import type { PartialStrykerOptions } from '@stryker-mutator/api/core'

export default {
  coverageAnalysis: 'perTest',
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  // Static mutants sit in code that runs at module load, such as prevMatchMap in bracket-graph.ts.
  // Testing one means reloading the module and running every test, which is most of a full run.
  // `ignoreStatic` skips only mutants that run purely at load.
  // Most of ours also run inside some test, and Stryker then tests them without a reload, so they survive falsely.
  // Measured on src/lib, it cut a run from 582 s to 396 s but added about 77 false survivors.
  ignoreStatic: false,
  incremental: true,
  incrementalFile: 'reports/mutation/stryker-incremental.json',
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  // The pure domain logic is where a surviving mutant most likely points at a real test gap.
  // Assertion helpers that only guard compile-time exhaustiveness are left out, as in the coverage config.
  mutate: ['src/lib/**/*.ts', '!src/lib/**/*.spec.ts', '!src/lib/assert-never.ts'],
  // Auto-discovery scans the node_modules folder next to Stryker's core package.
  // The linked install strategy in .npmrc keeps the runner out of that folder, so it has to be named explicitly.
  plugins: ['@stryker-mutator/vitest-runner'],
  reporters: ['clear-text', 'progress', 'html', 'json'],
  tempDirName: '.stryker-tmp',
  testRunner: 'vitest',
  // The score is about 89%, and flaky static mutants move it by about a point, so `break` keeps some headroom.
  thresholds: { break: 85, high: 90, low: 85 },
} satisfies PartialStrykerOptions
