import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { SortOrder } from '../../api/models';
import { FreshnessNote } from '../ui/freshness-note';
import { FilterStateService } from '../utils/filter-state.service';
import { formatCount } from '../utils/format';
import { SORT_LABELS } from '../utils/labels';

const SORTS: SortOrder[] = [
  'date_desc',
  'date_asc',
  'amount_desc',
  'amount_asc',
  'deadline_asc',
  'relevance',
];

/**
 * Encabezado de un listado: total (anunciado con `aria-live`), frescura de los datos, orden y
 * acciones proyectadas (guardar, exportar).
 */
@Component({
  selector: 'app-results-header',
  imports: [FreshnessNote],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="font-medium tabular" aria-live="polite" aria-atomic="true">
          @if (loading()) {
            <span class="text-muted">Buscando…</span>
          } @else {
            {{ countLabel() }}
          }
        </p>
        @if (lastSyncedAt(); as synced) {
          <app-freshness-note [lastSyncedAt]="synced" />
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <label class="flex items-center gap-2 text-sm text-muted">
          Ordenar
          <select
            class="input w-auto py-1.5"
            [value]="currentSort()"
            (change)="sort($any($event.target).value)"
          >
            @for (option of sortOptions(); track option) {
              <option [value]="option">{{ labels[option] }}</option>
            }
          </select>
        </label>
        <ng-content />
      </div>
    </div>
  `,
})
export class ResultsHeader {
  private readonly state = inject(FilterStateService);

  readonly total = input<number | undefined>(undefined);
  readonly capped = input(false);
  readonly loading = input(false);
  readonly noun = input<[string, string]>(['resultado', 'resultados']);
  readonly lastSyncedAt = input<Record<string, string | null> | undefined>(undefined);
  /** `deadline_asc` solo tiene sentido en procesos. */
  readonly withDeadline = input(true);

  protected readonly labels = SORT_LABELS;
  protected readonly sortOptions = computed(() =>
    SORTS.filter(
      (s) =>
        (s !== 'deadline_asc' || this.withDeadline()) &&
        (s !== 'relevance' || !!this.state.filters().q),
    ),
  );
  protected readonly currentSort = computed(() => this.state.filters().sort ?? 'date_desc');
  protected readonly countLabel = computed(() => {
    const total = this.total();
    if (total === undefined) return '';
    const [one, many] = this.noun();
    const prefix = this.capped() ? 'Más de ' : '';
    return `${prefix}${formatCount(total)} ${total === 1 ? one : many}`;
  });

  protected sort(value: string): void {
    void this.state.update({ sort: value === 'date_desc' ? null : (value as SortOrder) });
  }
}
