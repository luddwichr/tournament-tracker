# 2026 FIFA World Cup — tournament rules (reference)

This is the regulatory background the app encodes. It is a developer reference,
not user-facing text. The authoritative source is the **FIFA World Cup 2026
Regulations** (May 2025); the links below point at the Wikipedia pages that
reproduce the relevant tables, which is where this project sourced its data.

- Tournament overview: <https://en.wikipedia.org/wiki/2026_FIFA_World_Cup>
- The final draw (groups): <https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_draw>
- Knockout stage + bracket: <https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage>
- Third-place allocation table: <https://en.wikipedia.org/wiki/Template:2026_FIFA_World_Cup_third-place_table>
- FIFA regulations (PDF): <https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf>
- FIFA match schedule (PDF): <https://digitalhub.fifa.com/m/1be9ce37eb98fcc5/original/FWC26-Match-Schedule_English.pdf>

## Format

- **48 teams**, drawn into **12 groups of four** (A–L). First expansion from 32
  teams; the group stage uses four-team groups (an earlier three-team-group plan
  was scrapped in March 2023).
- **104 matches** total: 72 group matches + 32 knockout matches. Each team still
  plays exactly three group matches.
- Hosts (seeded into Pot 1): **Mexico** (A1), **Canada** (B1), **United States**
  (D1).
- Tournament runs **11 June – 19 July 2026** across 16 venues in Canada, Mexico
  and the USA. Group stage 11–27 June; knockout 28 June – 19 July.

## Advancing from the group stage

The **top two of each group** (24 teams) plus the **eight best third-placed
teams** (out of 12) advance to the round of 32 — 32 teams total.

### Group ranking — FIFA tiebreakers (in order)

Applied to decide positions within a group:

1. Points (3 win / 1 draw / 0 loss)
2. Goal difference across all group matches
3. Goals scored across all group matches
4. Points in matches **between the tied teams** (head-to-head)
5. Goal difference in head-to-head matches
6. Goals scored in head-to-head matches
7. **Fair-play points** (see below)
8. Drawing of lots by FIFA

> **Subgroup rule (critical):** the head-to-head criteria (4–6) apply only to the
> matches played among the still-tied teams. If applying them splits a group of
> N tied teams into a smaller still-tied subset, the **full chain restarts from
> step 1** on that subset. See [`docs/tiebreakers.md`](./tiebreakers.md).

> **This app's deviation:** step 8 (drawing of lots) is non-deterministic and
> unsuitable for an offline tracker, so the app replaces it with the team's
> **FIFA World Ranking position** (`Team.fifaRanking`, lower = better). This
> makes the chain always resolve deterministically — no unresolved-tie state.

### Fair-play points (simplified)

The app uses a simplified fair-play score, summed across all of a team's group
matches, where **higher (less negative) is better**:

```
score = (−1 × yellow cards) + (−3 × red cards)
```

A red card here includes a second-yellow send-off. (FIFA's official rule has
finer-grained values for single yellow / indirect red / direct red / yellow+red;
this project intentionally simplifies — see [`docs/tiebreakers.md`](./tiebreakers.md).)

### Ranking the third-placed teams

The 12 third-placed teams are ranked by the same criteria (points, GD, goals
scored, …, then FIFA ranking in this app). The **top eight** advance.

## Knockout stage

Single elimination, 32 matches: **round of 32 → round of 16 → quarter-finals →
semi-finals → third-place play-off → final**. The third-place play-off is
contested by the two losing semi-finalists.

### Round-of-32 pairings (FIFA schedule)

Of the 12 group winners, four play group runners-up and eight play advancing
third-placed teams; the remaining runners-up play each other.

| Match | Home        | Away                  |
| ----- | ----------- | --------------------- |
| 73    | Runner-up A | Runner-up B           |
| 74    | Winner E    | 3rd place (A/B/C/D/F) |
| 75    | Winner F    | Runner-up C           |
| 76    | Winner C    | Runner-up F           |
| 77    | Winner I    | 3rd place (C/D/F/G/H) |
| 78    | Runner-up E | Runner-up I           |
| 79    | Winner A    | 3rd place (C/E/F/H/I) |
| 80    | Winner L    | 3rd place (E/H/I/J/K) |
| 81    | Winner D    | 3rd place (B/E/F/I/J) |
| 82    | Winner G    | 3rd place (A/E/H/I/J) |
| 83    | Runner-up K | Runner-up L           |
| 84    | Winner H    | Runner-up J           |
| 85    | Winner B    | 3rd place (E/F/G/I/J) |
| 86    | Winner J    | Runner-up H           |
| 87    | Winner K    | 3rd place (D/E/I/J/L) |
| 88    | Runner-up D | Runner-up G           |

Bracket from there (winners advance; M103 = third place from the losers):

```
R16:  89=W74·W77  90=W73·W75  91=W76·W78  92=W79·W80
      93=W83·W84  94=W81·W82  95=W86·W88  96=W85·W87
QF:   97=W89·W90  98=W93·W94  99=W91·W92  100=W95·W96
SF:   101=W97·W98 102=W99·W100
3rd:  103=L101·L102      Final: 104=W101·W102
```

### Third-placed-team allocation (FIFA "Annex C")

The eight round-of-32 slots that take a third-placed team are hosted by the
winners of groups **A, B, D, E, G, I, K, L**. _Which_ third-placed team each host
faces depends on **which eight of the twelve groups** supply a qualifying
third-placed team — there are `C(12,8) = 495` possible combinations, each with a
fixed assignment published in Annex C of the regulations.

The app encodes all 495 combinations verbatim in
[`src/data/fixtures-2026.ts`](../src/data/fixtures-2026.ts) as
`THIRD_PLACE_ALLOCATION` (keyed by the eight qualifying groups as a sorted
string, e.g. `'EFGHIJKL'`), with `THIRD_PLACE_SLOT_HOST` mapping the eight slots
to their host group. This table is **the** source of truth — community
implementations of past tournaments frequently get it wrong, so it must never be
"recomputed" by intuition.

## What this app does and does not model

- Models: schedule, results entry, group standings (with the full tiebreaker
  chain above), third-placed-team ranking, and fully automatic knockout
  propagation.
- Does **not** model: extra time / penalty shoot-outs as distinct data (a
  knockout result is simply whoever the user records as the winner), disciplinary
  suspensions, squad changes, or venues. See `IMPL_PLAN.md` → "Out of scope".
