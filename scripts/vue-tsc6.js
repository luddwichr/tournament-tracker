#!/usr/bin/env node
// run vue-tsc against the real TypeScript 6 compiler.
//
// Part of the TS 6 + 7 side-by-side setup; background, tracking issues and
// removal checklist live in docs/typescript-7-side-by-side.md. In short:
// vue-tsc cannot type-check with TS 7 until it has a programmatic API
// (https://github.com/vuejs/language-tools/issues/5381), and it cannot use
// the `typescript` → @typescript/typescript6 alias directly either: it
// patches the file behind `typescript/lib/tsc`, and the repackage ships
// that as a one-line `require("@typescript/old/lib/tsc.js")` shim that
// @volar/typescript does not recognize (it only handles the genuine
// compiler source or the relative `module.exports = require("./_tsc.js")`
// shim TypeScript itself ships).
// So resolve @typescript/old, which is the genuine typescript@6 hidden behind the alias.
// Then hand its tsc entry point to vue-tsc's run().
//
// Usage: node scripts/vue-tsc6.js [vue-tsc args, e.g. -b]

import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(import.meta.url)

// realpathSync: with install-strategy=linked, node_modules/typescript is a
// symlink and @typescript/old is only resolvable from its store location.
const aliasRequire = createRequire(fs.realpathSync(require.resolve('typescript/package.json')))
const realTsc6 = aliasRequire.resolve('@typescript/old/lib/tsc.js')

require('vue-tsc').run(realTsc6)
