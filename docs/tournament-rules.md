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

### Group ranking — FIFA tiebreakers (Article 13)

Teams are first ranked by **points** (3 win / 1 draw / 0 loss). If two or more
teams in a group are level on points, **Article 13** of the regulations applies
the criteria below, in order. For 2026 FIFA reordered the chain so that
**head-to-head is applied _before_ overall goal difference** (the reverse of the
2018/2022 order). The app implements this chain in
[`src/lib/tiebreakers.ts`](../src/lib/tiebreakers.ts).

**Step 1 — head-to-head, among _all_ the tied teams** (only the matches played
between the teams concerned count):

1. (a) Points in the matches between the tied teams
2. (b) Goal difference in those matches
3. (c) Goals scored in those matches

**Step 2 — for any teams that are _still_ tied after Step 1:**

First, criteria (a)–(c) are **re-applied to the matches among only the teams that
remain tied** (a smaller head-to-head table). If that still does not separate
them, the following whole-group criteria apply:

4. (d) Goal difference across all group matches
5. (e) Goals scored across all group matches
6. (f) **Team conduct / fair-play score** (see below)

> **No-restart rule (Step 2):** once (d)–(f) separate _some_ but not all teams,
> the two or three teams that remain are carried on to the **next** criterion in
> the list — Step 2 does **not** restart from (d). (This differs from the Step 1
> → Step 2 transition, where the head-to-head table _is_ recomputed for the
> reduced set of still-tied teams.)

**Step 3 — if teams are still level after Steps 1–2:**

7. (g) The **most recent** published FIFA/Coca-Cola Men's World Ranking
8. (h) Successively **older** editions of that ranking, until a decision is made

> **There is no "drawing of lots."** The 2026 regulations make the **FIFA World
> Ranking** the definitive final tiebreaker (current edition, then older editions
> per criterion (h)) — there is no random draw in the group-ranking chain.
>
> The app stores a single `Team.fifaRanking` (lower = better) for criterion (g).
> Because every team has a unique ranking position, (g) always resolves, so the
> older-edition fallback (h) is never reached and the chain is always
> deterministic — no unresolved-tie state.

### Fair-play / conduct points

FIFA's official conduct score (Article 13, criterion (f)) sums per-card
deductions across all of a team's group matches, where **higher (less negative)
is better**. Only **one** deduction is applied to a given player or official per
match:

| Card                                       | Points |
| ------------------------------------------ | ------ |
| Yellow card                                | −1     |
| Indirect red card (two yellows in a match) | −3     |
| Direct red card                            | −4     |
| Yellow card **and** direct red card        | −5     |

> **Simplified in this app:** the app does not track which kind of red was shown,
> so it collapses all sending-offs to a single −3 (a second-yellow red and a
> straight red count the same):
>
> ```
> score = (−1 × yellow cards) + (−3 × red cards)
> ```
>
> This under-counts a direct red (−3 vs FIFA's −4) and a yellow+red (−3 vs −5); in
> a tracker this rarely changes an outcome.

### Ranking the third-placed teams

The 12 third-placed teams come from different groups and never met, so
**head-to-head does not apply**. They are ranked (Article 13) by: points → goal
difference (all matches) → goals scored (all matches) → conduct/fair-play score →
FIFA World Ranking (most recent, then older editions). The **top eight** advance.

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
- Does **not** model: extra time as distinct data, kick-by-kick shoot-out
  sequences (a shoot-out is recorded as per-side penalty-goal totals next to
  the level regular score; the winner follows from them), disciplinary
  suspensions, squad changes, or venues.
