#!/usr/bin/env -S NODE_COMPILE_CACHE=/tmp/claude-hooks-node-compile-cache node
// Prints the status line of Claude Code from the session data it passes on stdin.
// The fields are documented at https://code.claude.com/docs/en/statusline
// This runs as its own `node` process on every render, so process startup dominates its cost.
// `NODE_COMPILE_CACHE` above persists Node's compiled-code cache across invocations, which cuts that cost roughly in half.
// If the cache directory can't be created or written, Node just skips caching and runs at the original, uncached speed.
// That can happen on a read-only filesystem or with an older Node version.
import { execFileSync } from 'node:child_process'
import { text } from 'node:stream/consumers'

type RateLimitWindow = {
  used_percentage: number
  // Unix epoch seconds
  resets_at: number
}

type StatusLineInput = {
  model: { display_name: string }
  context_window?: { used_percentage?: number | null }
  // Estimated at list price from the token counts of the session, including cache reads and writes, reset by /clear.
  // On a subscription it only shows what the session would cost through the API.
  cost?: { total_cost_usd?: number }
  // Only present for Pro and Max subscriptions and only after the first API response, each window may be absent on its own
  rate_limits?: {
    five_hour?: RateLimitWindow
    seven_day?: RateLimitWindow
  }
}

const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'
const RESET = '\x1b[0m'

const data = JSON.parse(await text(process.stdin)) as StatusLineInput

function gitPart(): string {
  let status: string
  try {
    status = execFileSync('git', ['status', '--porcelain=v2', '--branch', '--untracked-files=no'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    // Outside a git repository or without git the section is left out
    return ''
  }
  let branch = ''
  let staged = 0
  let modified = 0
  for (const line of status.split('\n')) {
    if (line.startsWith('# branch.head ')) branch = line.slice('# branch.head '.length)
    // Changed entries start with 1, 2 or u, followed by the staged and the unstaged state, where `.` means unchanged
    if (/^[12u] /.test(line)) {
      if (line[2] !== '.') staged++
      if (line[3] !== '.') modified++
    }
  }
  let changes = ''
  if (staged) changes += `${GREEN}+${staged}${RESET}`
  if (modified) changes += `${YELLOW}~${modified}${RESET}`
  return `🌿 ${branch}${changes ? ' ' + changes : ''}`
}

function contextPart(): string {
  const percent = Math.floor(data.context_window?.used_percentage ?? 0)
  const filled = Math.floor(percent / 10)
  const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled)
  return `${CYAN}${bar}${RESET} ${percent}%`
}

function costPart(): string {
  const usd = data.cost?.total_cost_usd
  return usd === undefined ? '' : `~$${usd.toFixed(2)}`
}

function colorByUsage(percent: number): string {
  if (percent >= 80) return RED
  if (percent >= 50) return YELLOW
  return GREEN
}

function rateLimitPart(
  label: string,
  window: RateLimitWindow | undefined,
  resetFormat: Intl.DateTimeFormatOptions,
): string {
  if (!window) return ''
  const percent = Math.round(window.used_percentage)
  const reset = new Date(window.resets_at * 1000).toLocaleString('en-GB', resetFormat)
  return `${label} ${colorByUsage(percent)}${percent}%${RESET} ↻ ${reset}`
}

const time: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
const parts = [
  data.model.display_name,
  gitPart(),
  contextPart(),
  costPart(),
  rateLimitPart('5h', data.rate_limits?.five_hour, time),
  rateLimitPart('7d', data.rate_limits?.seven_day, { weekday: 'short', ...time }),
]
console.log(parts.filter(Boolean).join(' | '))
