<script setup lang="ts">
import type { ThirdPlaceRanking } from '../lib/third-place'
import { QUALIFYING_THIRDS_COUNT } from '../lib/third-place'
import ThirdPlaceRow from './ThirdPlaceRow.vue'
import InfoDisclosure from './InfoDisclosure.vue'

defineProps<{
  liveRanking: ThirdPlaceRanking
}>()
</script>

<template>
  <section class="third-place-table surface-card" aria-label="Beste Drittplatzierte">
    <header class="third-place-table__header">
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
      <table class="third-place-table__table tinted-header">
        <caption class="visually-hidden">
          Rangliste der zwölf Gruppendritten
        </caption>
        <thead>
          <tr>
            <th scope="col" class="third-place-table__team-col">Team</th>
            <th scope="col" class="third-place-table__num-col" title="Punkte">Pkt</th>
            <th scope="col" class="third-place-table__num-col" title="Tordifferenz">TD</th>
            <th scope="col" class="third-place-table__num-col" title="Erzielte Tore">Tore</th>
            <th scope="col" class="third-place-table__num-col" title="Fair-Play-Punkte">FP</th>
            <th scope="col" class="third-place-table__num-col" title="FIFA-Weltrangliste">FIFA</th>
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
.third-place-table__header {
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-primary);
  color: var(--color-primary-contrast);
}

.third-place-table__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.third-place-table__scroll {
  overflow-x: auto;
}

.third-place-table__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.third-place-table__table th {
  padding: var(--space-1) var(--space-1);
  text-align: center;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.third-place-table__table thead .third-place-table__team-col {
  text-align: left;
  padding-left: var(--space-3);
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
  padding-left: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
