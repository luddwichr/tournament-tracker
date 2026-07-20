<script setup lang="ts">
import InfoDisclosure from './InfoDisclosure.vue'
import { QUALIFYING_THIRDS_COUNT } from '../lib/third-place'
import StatHeaderCell from './StatHeaderCell.vue'
import type { ThirdPlaceRanking } from '../lib/third-place'
import ThirdPlaceRow from './ThirdPlaceRow.vue'

defineProps<{
  liveRanking: ThirdPlaceRanking
}>()

const columns = [
  { abbr: 'Pkt', label: 'Punkte' },
  { abbr: 'TD', label: 'Tordifferenz' },
  { abbr: 'Tore', label: 'Erzielte Tore' },
  { abbr: 'FP', label: 'Fair-Play-Punkte' },
  { abbr: 'FIFA', label: 'FIFA-Weltrangliste' },
]
</script>

<template>
  <section class="third-place-table surface-card" aria-label="Beste Drittplatzierte">
    <header class="third-place-table__header card-header">
      <h2 class="third-place-table__title">Die besten {{ QUALIFYING_THIRDS_COUNT }} Drittplatzierten</h2>
    </header>

    <InfoDisclosure summary="Wie wird das entschieden?" class="third-place-table__explainer">
      <p>
        Die zwölf Gruppendritten haben nicht gegeneinander gespielt, deshalb zählt hier kein direkter Vergleich.
        Stattdessen wird der Reihe nach verglichen — sobald ein Schritt einen Unterschied zeigt, ist die Reihenfolge
        klar:
      </p>
      <ol class="third-place-table__steps">
        <li><span aria-hidden="true">🏆</span> Wer mehr <strong>Punkte</strong> hat, steht weiter oben.</li>
        <li>
          <span aria-hidden="true">⚽</span> Bei gleichen Punkten zählt die <strong>Tordifferenz</strong> (geschossene
          minus kassierte Tore).
        </li>
        <li><span aria-hidden="true">🥅</span> Danach zählen die <strong>geschossenen Tore</strong>.</li>
        <li>
          <span aria-hidden="true">🟨🟥</span> Ist es immer noch gleich, entscheidet <strong>Fair Play</strong>: Wer
          weniger Gelbe und Rote Karten hat, gewinnt.
        </li>
        <li>
          <span aria-hidden="true">🌍</span> Ganz zum Schluss entscheidet die <strong>FIFA-Weltrangliste</strong> — die
          besser platzierte Mannschaft gewinnt.
        </li>
      </ol>
    </InfoDisclosure>

    <section class="third-place-table__scroll" aria-label="Rangliste" tabindex="0">
      <table class="third-place-table__table stat-table tinted-header">
        <caption class="visually-hidden">
          Rangliste der zwölf Gruppendritten
        </caption>
        <thead>
          <tr>
            <th scope="col" class="third-place-table__team-col">Team</th>
            <StatHeaderCell
              v-for="col in columns"
              :key="col.abbr"
              class="third-place-table__num-col"
              :abbr="col.abbr"
              :label="col.label"
            />
          </tr>
        </thead>
        <tbody>
          <ThirdPlaceRow
            v-for="(stat, idx) in liveRanking.ranked"
            :key="stat.team.id"
            :stat="stat"
            :rank="idx + 1"
            :final="liveRanking.final"
          />
        </tbody>
      </table>
    </section>
  </section>
</template>

<style scoped>
.third-place-table__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.third-place-table__scroll {
  overflow-x: auto;
}

/* Table base and th recipe come from .stat-table (standings-row.css). */
.third-place-table__table thead .third-place-table__team-col {
  text-align: start;
  padding-inline-start: var(--space-3);
}

.third-place-table__num-col {
  min-width: 1.25rem;
}

.third-place-table__explainer {
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-1) var(--space-2);
}

.third-place-table__steps {
  margin: 0;
  padding-inline-start: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
