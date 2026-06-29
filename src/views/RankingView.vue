<script setup lang="ts">
import { computed } from 'vue'
import { fifaRanking } from '../data/fifa-ranking'
import { teams } from '../data/teams'
import type { Team } from '../types/tournament'
import TeamFlag from '../components/TeamFlag.vue'
import TeamLabel from '../components/TeamLabel.vue'

// World Cup participation is owned by teams.ts; we match a ranking row to its
// Team by flag code so the highlight (and the squad link) stay in sync with the
// rest of the app. fifa-ranking.spec.ts guards that every team's code resolves.
const teamByFlag = new Map<string, Team>(teams.map((t) => [t.flagCode, t]))

const rows = computed(() =>
  fifaRanking.map((entry) => ({
    entry,
    team: teamByFlag.get(entry.flagCode) ?? null,
  })),
)

const numberFormat = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
</script>

<template>
  <main class="ranking-view">
    <header class="ranking-view__header">
      <h1>FIFA-Weltrangliste</h1>
      <p class="ranking-view__subtitle">
        Stand 11. Juni 2026 · {{ fifaRanking.length }} Mannschaften ·
        <span class="ranking-view__legend-swatch" aria-hidden="true" />
        {{ teams.length }} davon bei der WM 2026
      </p>
    </header>

    <section class="ranking-view__table-wrap surface-card" aria-label="FIFA-Weltrangliste" tabindex="0">
      <table class="ranking-table tinted-header">
        <caption class="visually-hidden">
          FIFA-Weltrangliste
        </caption>
        <thead>
          <tr>
            <th scope="col" class="ranking-table__rank-col">Rang</th>
            <th scope="col" class="ranking-table__team-col">Mannschaft</th>
            <th scope="col" class="ranking-table__pts-col">Punkte</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="{ entry, team } in rows"
            :key="entry.flagCode"
            class="ranking-row"
            :class="{ 'ranking-row--wc': team }"
          >
            <td class="ranking-row__rank">
              {{ entry.rank }}
            </td>
            <td class="ranking-row__team">
              <TeamLabel v-if="team" :team="team" flag-size="1.5rem" :clickable="true" />
              <span v-else class="ranking-row__name">
                <TeamFlag :flag-code="entry.flagCode" :name="entry.name" :decorative="true" />
                {{ entry.name }}
              </span>
            </td>
            <td class="ranking-row__pts">
              {{ numberFormat.format(entry.points) }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
</template>

<style scoped>
.ranking-view {
  padding: var(--space-5) var(--space-4);
  max-width: 44rem;
  margin-inline: auto;
}

.ranking-view__header {
  margin-block-end: var(--space-5);
}

h1 {
  margin: 0 0 var(--space-2);
}

.ranking-view__subtitle {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.ranking-view__legend-swatch {
  display: inline-block;
  width: 0.85em;
  height: 0.85em;
  vertical-align: -0.05em;
  border-radius: var(--radius-sm);
  background-color: color-mix(in srgb, var(--color-primary) 18%, transparent);
  border-inline-start: 3px solid var(--color-primary);
}

.ranking-view__table-wrap {
  /* surface-card applied via shared class in base.css */
}

.ranking-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-base);
}

.ranking-table th {
  padding: var(--space-3) var(--space-3);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.ranking-table thead .ranking-table__rank-col {
  width: 3rem;
  text-align: right;
}

.ranking-table thead .ranking-table__pts-col {
  text-align: right;
}

.ranking-row {
  border-top: 1px solid var(--color-border);
}

.ranking-row__rank {
  padding: var(--space-2) var(--space-3);
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
  font-weight: 600;
}

.ranking-row__team {
  padding: var(--space-2) var(--space-3);
  white-space: nowrap;
}

.ranking-row__name {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
}

.ranking-row__pts {
  padding: var(--space-2) var(--space-3);
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

/* World Cup 2026 participants: tinted row + left accent strip. The accent is
   paired with the bold name + flag, so color is never the sole signal. */
.ranking-row--wc {
  background-color: color-mix(in srgb, var(--color-primary) 7%, transparent);
}

.ranking-row--wc .ranking-row__rank {
  border-inline-start: 3px solid var(--color-primary);
  color: var(--color-text);
}

.ranking-row--wc .ranking-row__pts {
  color: var(--color-text);
}
</style>
