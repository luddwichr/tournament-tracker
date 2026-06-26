# Styling architecture

## Foundations

- **Reset:** `src/styles/reset.css` is Andy Bell's "A (more) modern CSS reset"
  ([source](https://piccalil.li/blog/a-more-modern-css-reset/)). It is the only
  base reset; do not add another.
- **Design tokens:** `src/styles/tokens.css` defines every color, spacing step,
  radius, shadow and font size as CSS custom properties on `:root`. Dark mode
  overrides the same tokens under `@media (prefers-color-scheme: dark)`.
- **Global base:** `src/styles/base.css` applies tokens to document-level
  elements and defines the project-wide `:focus-visible` ring plus the
  `.skip-link` and `.visually-hidden` utilities.
- All three are imported once in `src/main.ts`.
- **`flag-icons` CSS is deliberately NOT global.** The `flag-icons.min.css`
  stylesheet (~28 KB of country rules) is imported by the flag-rendering
  component (`TeamFlag.vue`, M3) so it ships in that route's lazy chunk rather
  than the entry bundle. Do not add it to `main.ts`.

## Tokens

| Group      | Tokens                                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Colors     | `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-primary`, `--color-primary-contrast`, `--color-win`, `--color-draw`, `--color-loss`, `--color-focus` |
| Spacing    | `--space-1` (4px) … `--space-8` (64px)                                                                                                                                                                 |
| Radii      | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`                                                                                                                                           |
| Shadows    | `--shadow-sm`, `--shadow-md`                                                                                                                                                                           |
| Font sizes | `--font-size-sm` … `--font-size-2xl`, `--font-size-score`                                                                                                                                              |
| Misc       | `--tap-target` (44px), `--font-family-base`                                                                                                                                                            |

Components must pull from these tokens — never hardcode raw color/spacing values.

## The spacing rule

> **Components only set `padding`; `margin` is the parent's job.**

A component owns its internal whitespace (padding) but never the gap between
itself and its siblings. Parents space children using `gap` (flex/grid) or
margins applied from the parent side. This keeps components reusable without
them owning their surrounding layout. Enforced in code review.

## Layout

- **Mobile-first.** Author at 360px first; widen with `min-width` media queries.
- **CSS Grid** for 2D page layouts (group cards, bracket); **Flexbox** for 1D
  rows (match-card rows, button bars). No floats, no absolute-positioning hacks.
- Keep CSS scoped to components (`<style scoped>`); shared values come from
  tokens, not utility classes.
