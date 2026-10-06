import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { OpportunityItem } from '../../api/models';
import { SearchService } from '../../api/search.service';
import { provideFilters } from '../../shared/filter-bar/filter-context';
import { FilterPanel } from '../../shared/filter-bar/filter-panel';
import { FilterSearch } from '../../shared/filter-bar/filter-search';
import { CopCurrencyPipe } from '../../shared/pipes/cop-currency.pipe';
import { emptySuggestions } from '../../shared/results/empty-suggestions';
import { ResultsHeader } from '../../shared/results/results-header';
import { BadgeVigente, SourceBadge, StatusBadge } from '../../shared/ui/badges';
import { PageHeader } from '../../shared/ui/page-header';
import { Pagination } from '../../shared/ui/pagination';
import { IndustryChips, LocationCell } from '../../shared/ui/record-cells';
import { EmptyState, ErrorState, Skeleton } from '../../shared/ui/states';
import { FilterStateService } from '../../shared/utils/filter-state.service';

/** `/buscar`: procesos y contratos juntos (`GET /search`), marcados "Proceso" o "Contrato". */
@Component({
  selector: 'app-search-page',
  imports: [
    DatePipe,
    RouterLink,
    CopCurrencyPipe,
    PageHeader,
    FilterPanel,
    FilterSearch,
    ResultsHeader,
    Pagination,
    EmptyState,
    ErrorState,
    Skeleton,
    StatusBadge,
    SourceBadge,
    BadgeVigente,
    IndustryChips,
    LocationCell,
  ],
  providers: [provideFilters('search')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      heading="Buscar"
      subtitle="Una sola búsqueda sobre licitaciones y contratos. Usa comillas para frases y - para excluir."
    />

    <div class="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      <app-filter-panel dateField="record" />

      <section class="min-w-0 space-y-4" aria-label="Resultados">
        <app-filter-search placeholder='Ej.: "alimentación escolar" OR refrigerios -cafetería' />

        <app-results-header
          [total]="page()?.totalCount"
          [capped]="page()?.totalCountIsCapped ?? false"
          [loading]="results.isLoading()"
          [lastSyncedAt]="page()?.freshness?.lastSyncedAt"
        />

        @if (results.error(); as error) {
          <app-error-state [error]="error" (retry)="results.reload()" />
        } @else if (page(); as data) {
          @if (data.items.length === 0) {
            <app-empty-state
              heading="Sin coincidencias"
              message="Prueba con otras palabras o quita filtros:"
              [suggestions]="suggestions()"
            />
          } @else {
            <ul
              class="space-y-3 transition-opacity"
              [class.opacity-60]="results.isLoading()"
              aria-label="Resultados de la búsqueda"
            >
              @for (item of data.items; track item.kind + item.source + item.sourceId) {
                <li class="card p-4" [class.row-active]="item.isActive">
                  <div class="flex flex-wrap items-center gap-2">
                    <span [class]="item.kind === 'process' ? 'badge-accent' : 'badge-info'">
                      {{ item.kind === 'process' ? 'Proceso' : 'Contrato' }}
                    </span>
                    <app-status-badge [status]="item.status" />
                    <app-source-badge [source]="item.source" />
                    <app-badge-vigente
                      [active]="item.isActive"
                      [deadline]="item.offersDeadlineAt"
                    />
                  </div>
                  <a
                    class="mt-2 block font-medium hover:text-accent hover:underline"
                    [routerLink]="link(item)"
                    >{{ item.title }}</a
                  >
                  <p class="mt-1 text-sm text-muted">{{ item.entityName }}</p>
                  <div class="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <app-location-cell [location]="item.location" />
                    <span class="font-medium tabular">{{ item.amount | copCurrency }}</span>
                    @if (item.date) {
                      <span class="text-muted tabular"
                        >{{ item.kind === 'process' ? 'Publicado' : 'Firmado' }} el
                        {{ item.date | date }}</span
                      >
                    }
                    <app-industry-chips [industries]="item.industries" [max]="2" />
                  </div>
                </li>
              }
            </ul>
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
export class SearchPage {
  protected readonly state = inject(FilterStateService);
  protected readonly results = inject(SearchService).search(() => this.state.filters());
  protected readonly page = computed(() =>
    this.results.hasValue() ? this.results.value() : undefined,
  );
  protected readonly suggestions = computed(() =>
    emptySuggestions(this.state.filters(), this.state.defaults).map((s) => ({
      label: s.label,
      apply: () => void this.state.update(s.patch),
    })),
  );

  protected link(item: OpportunityItem): string[] {
    return [item.kind === 'process' ? '/licitaciones' : '/contratos', item.source, item.sourceId];
  }
}
