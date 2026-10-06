import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { formatCount } from '../utils/format';
import { maxPageFor, PAGE_SIZES } from '../utils/filters';

/**
 * Paginación con tamaños 20/50/100. Respeta el límite de la API (`page × pageSize ≤ 10.000`)
 * y avisa cuando el total viene con tope (`totalCountIsCapped`).
 */
@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (capped()) {
      <p class="mb-3 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
        Más de {{ maxLabel }} resultados, afina los filtros.
      </p>
    }
    <nav
      class="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between"
      aria-label="Paginación"
    >
      <p class="text-muted tabular">
        @if (total() > 0) {
          {{ rangeLabel() }}
        }
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2 text-muted">
          Por página
          <select
            class="input w-auto py-1.5"
            [value]="pageSize()"
            (change)="pageSizeChange.emit(+$any($event.target).value)"
          >
            @for (size of sizes; track size) {
              <option [value]="size">{{ size }}</option>
            }
          </select>
        </label>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="btn-secondary px-2.5"
            [disabled]="page() <= 1"
            (click)="pageChange.emit(page() - 1)"
          >
            <span aria-hidden="true">←</span> Anterior
          </button>
          <span class="px-2 tabular" aria-live="polite"
            >Página {{ page() }} de {{ lastPage() }}</span
          >
          <button
            type="button"
            class="btn-secondary px-2.5"
            [disabled]="page() >= lastPage()"
            (click)="pageChange.emit(page() + 1)"
          >
            Siguiente <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </nav>
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly capped = input(false);
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected readonly sizes = PAGE_SIZES;
  protected readonly maxLabel = formatCount(10_000);
  protected readonly lastPage = computed(() =>
    Math.max(1, Math.min(Math.ceil(this.total() / this.pageSize()), maxPageFor(this.pageSize()))),
  );
  protected readonly rangeLabel = computed(() => {
    const from = (this.page() - 1) * this.pageSize() + 1;
    const to = Math.min(this.page() * this.pageSize(), this.total());
    const more = this.capped() ? '+' : '';
    return `${formatCount(from)}–${formatCount(to)} de ${formatCount(this.total())}${more}`;
  });
}
