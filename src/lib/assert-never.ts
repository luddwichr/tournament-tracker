/**
 * Exhaustiveness-check helper for `switch` statements over a discriminated
 * union. TypeScript narrows `value` to `never` once every case is handled, so
 * this only compiles at call sites where the switch is genuinely exhaustive —
 * any new union member fails the build until a case is added. At runtime
 * (e.g. malformed persisted data) it throws with the unhandled value.
 */
export function assertNever(value: never, context?: string): never {
  const label = context ? `Unhandled ${context}` : 'Unhandled value'
  throw new Error(`${label}: ${JSON.stringify(value)}`)
}
