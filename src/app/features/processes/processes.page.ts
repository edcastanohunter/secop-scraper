import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ProcessesService } from '../../api/processes.service';
import { HasRoleDirective } from '../../core/auth/has-role.directive';
import { FilterPanel } from '../../shared/filter-bar/filter-panel';
import { FilterSearch } from '../../shared/filter-bar/filter-search';
import { provideFilters } from '../../shared/filter-bar/filter-context';
import { emptySuggestions } from '../../shared/results/empty-suggestions';
import { ProcessResults } from '../../shared/results/process-results';
import { ResultsHeader } from '../../shared/results/results-header';
import { ExportButton } from '../../shared/saved-search/export-button';
import { SaveSearchButton } from '../../shared/saved-search/save-search-button';
import { PageHeader } from '../../shared/ui/page-header';
import { Pagination } from '../../shared/ui/pagination';
import { EmptyState, ErrorState, Skeleton } from '../../shared/ui/states';
import { FilterStateService } from '../../shared/utils/filter-state.service';

/** `/licitaciones`: procesos con "Solo vigentes" y "Solo competitivos" activos por defecto. */
@Component({
  selector: 'app-processes-page',
  imports: [
    PageHeader,
    FilterPanel,
    FilterSearch,
    ResultsHeader,
    ProcessResults,
    Pagination,
    EmptyState,
    ErrorState,
    Skeleton,
    ExportButton,
    SaveSearchButton,
    HasRoleDirective,
  ],
  providers: [provideFilters('processes')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      heading="Licitaciones"
      subtitle="Procesos de compra pública de SECOP I y II, normalizados por municipio e industria."
    />

    <div class="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      <app-filter-panel dateField="published" />

      <section class="min-w-0 space-y-4" aria-label="Resultados">
        <app-filter-search />

        <app-results-header
          [total]="page()?.totalCount"
          [capped]="page()?.totalCountIsCapped ?? false"
          [loading]="results.isLoading()"
          [noun]="['proceso', 'procesos']"
          [lastSyncedAt]="page()?.freshness?.lastSyncedAt"
        >
          <app-save-search-button
            *appHasRole="'alerts:manage'"
            kind="processes"
            [filters]="filters()"
          />
          <app-export-button
            *appHasRole="'procurement:export'"
            kind="processes"
            [filters]="filters()"
          />
        </app-results-header>

        @if (results.error(); as error) {
          <app-error-state [error]="error" (retry)="results.reload()" />
        } @else if (page(); as data) {
          @if (data.items.length === 0) {
            <app-empty-state
              heading="No encontramos licitaciones con estos filtros"
              message="Prueba a ampliar la búsqueda:"
              [suggestions]="suggestions()"
            />
          } @else {
            <div class="transition-opacity" [class.opacity-60]="results.isLoading()">
              <app-process-results [items]="data.items" />
            </div>
            <app-pagination
              [page]="data.page"
              [pageSize]="data.pageSize"
              [total]="data.totalCount"
              [capped]="data.totalCountIsCapped"
              (pageChange)="state.update({ page: $event })"
              (pageSizeChange)="state.update({ pageSize: $event })"
            />
          }
        } @else {
          <app-skeleton [rows]="6" />
        }
      </section>
    </div>
  `,
})
export class ProcessesPage {
  protected readonly state = inject(FilterStateService);
  protected readonly filters = this.state.filters;
  protected readonly results = inject(ProcessesService).list(() => this.filters());
  protected readonly page = computed(() =>
    this.results.hasValue() ? this.results.value() : undefined,
  );
  protected readonly suggestions = computed(() =>
    emptySuggestions(this.filters(), this.state.defaults).map((s) => ({
      label: s.label,
      apply: () => void this.state.update(s.patch),
    })),
  );
}
