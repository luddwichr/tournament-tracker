#!/usr/bin/env node
import { execSync } from 'child_process'

// ANSI color codes
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const RESET = '\x1b[0m'

// Read JSON context from stdin
const chunks = []
for await (const chunk of process.stdin) chunks.push(chunk)
const data = JSON.parse(Buffer.concat(chunks).toString())

// --- Git status ---
let gitPart = ''
try {
  execSync('git rev-parse --git-dir', { stdio: 'ignore' })

  const branch = execSync('git branch --show-current', {
    encoding: 'utf8',
  }).trim()
  const staged = execSync('git diff --cached --numstat', { encoding: 'utf8' }).trim().split('\n').filter(Boolean).length
  const modified = execSync('git diff --numstat', { encoding: 'utf8' }).trim().split('\n').filter(Boolean).length

  // +N = staged (green), ~N = unstaged modifications (yellow)
  let changes = ''
  if (staged) changes += `${GREEN}+${staged}${RESET}`
  if (modified) changes += `${YELLOW}~${modified}${RESET}`

  gitPart = `🌿 ${branch}${changes ? ' ' + changes : ''}`
} catch {
  // Not a git repo or git not available — omit git section
}

// --- Context window usage ---
// used_percentage: 0–100 float from Claude Code; rendered as a 10-block progress bar
const pct = Math.floor(data.context_window?.used_percentage || 0)
const filled = Math.floor((pct * 10) / 100)
const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled)
const ctxPart = `${CYAN}${bar}${RESET} ${pct}%`
const model = data.model.display_name

// --- Assemble ---
const parts = [model, gitPart, ctxPart].filter(Boolean)
console.log(parts.join(' | '))
