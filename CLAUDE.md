# CLAUDE.md

## Writing style for comments, docs and commit messages

These rules apply to every piece of natural-language prose in this repo.
That covers code comments, JSDoc, Markdown docs, the README and commit messages.
Follow them by default.

### Short sentences, one per line

- Write short, expressive sentences.
  Prefer several plain sentences over one long compound sentence.
- Put **one sentence per line**.
  Start a new line at every sentence boundary.
- Only wrap a sentence across lines when it exceeds the **120-character** limit, set as `printWidth` in
  `.oxfmtrc.json`.
  Do not wrap at ~80 characters.
- The 120-character budget includes the comment prefix and any indentation.

### No em-dashes, no semicolon splices

- Do **not** use em-dashes to join or interrupt clauses.
  Replace them with a comma, with a connective such as "because", "so", "which" or "since", or by splitting into a new
  sentence.
- Do **not** use a semicolon to join two independent clauses.
  Split them into two sentences.
- Avoid the parenthetical-aside habit.
  Promote the aside to its own sentence when it carries real information, and delete it when it does not.

Exceptions, left alone deliberately:

- **En-dashes (`–`) in ranges and scores** are correct typography.
  Keep `A–L`, `M01–M72`, `11–27 June` and `3–0`.
- **German user-facing strings** follow German typographic convention.
  Do not restyle rendered copy.
- **Existing `it()`, `describe()` and `test()` titles** are left as they are, so test-report diffs stay meaningful.
  New test titles should follow the prose rules.

### Delete comments that earn nothing

- If a comment only restates what the code and its tests already say, delete it rather than rewording it.
- Do not add a section-label comment above a `describe` block that repeats the block's own name.
- Do **not** use separator bars such as `// ------` or `// ======` to group code.
  Use blank lines and real structure instead.
  If a block genuinely needs a heading, write a plain sentence.

### Describe the present, not the history

- Explain **why the code is the way it is now**.
  Do not narrate how it used to be.
- Drop phrases like "used to", "previously", "this replaced", "the old behaviour" and "regression test for X".
  Drop references to specific past commits and issue numbers too.
- Do not cite section numbers of documents that churn, such as `REVIEW.md §9.1` or `REQUIREMENTS.md §9.8`.
  Those references go stale silently.
  Reference a **file** or a **symbol** instead, or restate the reasoning inline.
- Cross-references to stable files are fine, for example `see invalidation.spec.ts` or `see src/lib/persistence.ts`.

### Markdown specifics

- One sentence per line applies to Markdown prose too.
  This keeps diffs line-scoped and reviewable.
- In tables, keep cell text short.
  A table cell is the one place where splitting into several sentences reads worse than tightening the wording, so
  tighten instead.
- Headings are noun phrases without trailing punctuation.

## Formatting tooling and what it does _not_ do

`oxfmt` owns formatting for JS, TS, Vue, JSON, CSS and Markdown via `npm run format`.
Two settings matter for the rules above.

- `printWidth: 120` is the hard line limit.
- `proseWrap` is explicitly set to the default `"preserve"` to make the formatter respect manual line breaks in Markdown.

Do **not** enable oxfmt's `jsdoc` option.
It greedily refills JSDoc comments to `printWidth`, which would collapse one-sentence-per-line back into justified
paragraphs.

No formatter or linter enforces the em-dash, semicolon-splice or separator-bar rules.
They are conventions, and it is on the author to follow them.
