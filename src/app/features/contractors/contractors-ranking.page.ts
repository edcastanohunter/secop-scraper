import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { TopSuppliersSort } from '../../api/models';
import { StatsService } from '../../api/stats.service';
import { provideFilters } from '../../shared/filter-bar/filter-context';
import { FilterPanel } from '../../shared/filter-bar/filter-panel';
import { CopCurrencyPipe } from '../../shared/pipes/cop-currency.pipe';
import { FreshnessNote } from '../../shared/ui/freshness-note';
import { PageHeader } from '../../shared/ui/page-header';
import { EmptyState, ErrorState, Skeleton } from '../../shared/ui/states';
import { FilterStateService } from '../../shared/utils/filter-state.service';
import { defaultDateRange } from '../../shared/utils/filters';
import { formatCount } from '../../shared/utils/format';
import { isNaturalPerson, supplierTypeLabel } from '../../shared/utils/supplier';

const SORTS: { value: TopSuppliersSort; label: string }[] = [
  { value: 'amount', label: 'Mayor monto' },
  { value: 'count', label: 'Mayor cantidad de contratos' },
];

const LIMITS = [10, 20, 50] as const;

/**
 * `/estadisticas/contratistas`: ranking nacional o filtrado por departamento,
 * municipio, industria o modalidad (SPEC 16).
 */
@Component({
  selector: 'app-contractors-ranking-page',
  imports: [
    DatePipe,
    RouterLink,
    CopCurrencyPipe,
    PageHeader,
    FilterPanel,
    FreshnessNote,
    EmptyState,
    ErrorState,
    Skeleton,
  ],
  providers: [provideFilters('stats')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      heading="Ranking de contratistas"
      subtitle="Los mayores contratistas de la contratación pública en Colombia según tus filtros de fecha y ubicación."
    />

    <div class="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      <app-filter-panel dateField="signed" />

      <div class="min-w-0 space-y-4">
        <!-- Barra de ordenamiento y límite -->
        <div
          class="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
          aria-label="Opciones del ranking"
        >
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-muted uppercase">Ordenar por:</span>
            <div class="inline-flex rounded-md border border-line p-0.5" role="group">
              @for (option of sorts; track option.value) {
                <button
                  type="button"
                  class="rounded px-2.5 py-1 text-xs font-medium"
                  [class]="
                    currentSort() === option.value
                      ? 'bg-accent text-on-accent'
                      : 'text-muted hover:text-ink'
                  "
                  [attr.aria-pressed]="currentSort() === option.value"
                  (click)="setSort(option.value)"
                >
                  {{ option.label }}
                </button>
              }
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-muted uppercase">Mostrar:</span>
            <div class="inline-flex rounded-md border border-line p-0.5" role="group">
              @for (limit of limits; track limit) {
                <button
                  type="button"
                  class="rounded px-2.5 py-1 text-xs font-medium tabular"
                  [class]="
                    currentLimit() === limit
                      ? 'bg-accent text-on-accent'
                      : 'text-muted hover:text-ink'
                  "
                  [attr.aria-pressed]="currentLimit() === limit"
                  (click)="setLimit(limit)"
                >
                  {{ limit }}
                </button>
              }
            </div>
          </div>
        </div>

        <section aria-label="Listado de contratistas" aria-live="polite">
          @if (ranking.error(); as error) {
            <app-error-state [error]="error" (retry)="ranking.reload()" />
          } @else if (rankingData(); as data) {
            @if (data.items.length === 0) {
              <app-empty-state
                heading="Sin contratistas en este periodo"
                message="No se encontraron contratos firmados que coincidan con los filtros aplicados. Intenta ampliar el rango de fechas o limpiar los filtros."
              />
            } @else {
              <!-- Tabla en escritorio -->
              <div class="card hidden overflow-x-auto md:block">
                <table class="table-base">
                  <caption class="sr-only">
                    Top contratistas por
                    {{
                      currentSort() === 'amount' ? 'monto' : 'cantidad'
                    }}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" class="w-12 text-center">#</th>
                      <th scope="col">Contratista</th>
                      <th scope="col">NIT</th>
                      <th scope="col">Tipo</th>
                      <th scope="col" class="text-end">Contratos</th>
                      <th scope="col" class="text-end">Monto total</th>
                      <th scope="col" class="w-24 text-end">Ficha</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of data.items; track item.supplierKey; let i = $index) {
                      <tr class="hover:bg-sunken/60">
                        <td class="text-center font-medium text-muted tabular">
                          {{ i + 1 }}
                        </td>
                        <td>
                          <a
                            class="font-medium text-ink hover:text-accent hover:underline"
                            [routerLink]="['/contratistas', item.supplierKey]"
                            >{{ item.supplierName }}</a
                          >
                          @if (isNatural(item.supplierKey)) {
                            <span
                              class="badge-warning ms-1 text-[11px]"
                              title="Agrupado por nombre normalizado (sin NIT publicado). Personas con el mismo nombre se consolidan en este perfil."
                            >
                              Sin NIT publicado
                            </span>
                          }
                        </td>
                        <td class="whitespace-nowrap text-muted tabular">
                          {{ item.supplierNit ? item.supplierNit : '—' }}
                        </td>
                        <td class="whitespace-nowrap text-sm text-muted">
                          {{ typeLabel(item.supplierKey) }}
                        </td>
                        <td class="text-end font-medium tabular">
                          {{ count(item.count) }}
                        </td>
                        <td class="text-end font-semibold tabular">
                          {{ item.totalAmount | copCurrency }}
                        </td>
                        <td class="text-end">
                          <a
                            class="link text-xs font-semibold"
                            [routerLink]="['/contratistas', item.supplierKey]"
                            >Ver →</a
                          >
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Tarjetas en móvil -->
              <ul class="space-y-3 md:hidden" aria-label="Ranking de contratistas">
                @for (item of data.items; track item.supplierKey; let i = $index) {
                  <li class="card p-4">
                    <div class="flex items-start justify-between gap-2">
                      <span class="badge-neutral font-bold tabular">#{{ i + 1 }}</span>
                      <span class="text-xs text-muted">{{ typeLabel(item.supplierKey) }}</span>
                    </div>

                    <a
                      class="mt-2 block font-semibold text-ink hover:text-accent hover:underline"
                      [routerLink]="['/contratistas', item.supplierKey]"
                      >{{ item.supplierName }}</a
                    >

                    @if (isNatural(item.supplierKey)) {
                      <p class="mt-1 text-xs text-warning">
                        Agrupado por nombre (sin NIT publicado)
                      </p>
                    }

                    <dl class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <div>
                        <dt class="text-xs text-muted">NIT</dt>
                        <dd class="tabular">{{ item.supplierNit ?? '—' }}</dd>
                      </div>
                      <div>
                        <dt class="text-xs text-muted">Contratos</dt>
                        <dd class="font-medium tabular">{{ count(item.count) }}</dd>
                      </div>
                      <div class="col-span-2">
                        <dt class="text-xs text-muted">Monto total</dt>
                        <dd class="text-base font-semibold tabular">
                          {{ item.totalAmount | copCurrency }}
                        </dd>
                      </div>
                    </dl>

                    <div class="mt-3 border-t border-line pt-2 text-end">
                      <a
                        class="link text-sm font-semibold"
                        [routerLink]="['/contratistas', item.supplierKey]"
                        >Ver ficha completa →</a
                      >
                    </div>
                  </li>
                }
              </ul>

              <div class="mt-4 flex flex-wrap gap-x-4 text-xs text-muted">
                <app-freshness-note [lastSyncedAt]="data.freshness.lastSyncedAt" />
                @if (data.freshness.statsRefreshedAt) {
                  <p>
                    Estadísticas recalculadas el
                    {{ data.freshness.statsRefreshedAt | date: 'dd/MM/yyyy HH:mm' }}
                  </p>
                }
              </div>
            }
          } @else {
            <app-skeleton variant="cards" [rows]="5" />
          }
        </section>
      </div>
    </div>
  `,
})
export class ContractorsRankingPage {
  private readonly router = inject(Router);
  private readonly stats = inject(StatsService);
  protected readonly state = inject(FilterStateService);

  readonly sort = input<string>();
  readonly limit = input<string>();

  protected readonly sorts = SORTS;
  protected readonly limits = LIMITS;

  protected readonly currentSort = computed<TopSuppliersSort>(() =>
    this.sort() === 'count' ? 'count' : 'amount',
  );

  protected readonly currentLimit = computed<number>(() => {
    const parsed = Number(this.limit());
    return LIMITS.includes(parsed as (typeof LIMITS)[number]) ? parsed : 10;
  });

  private readonly defaultRange = defaultDateRange(Date.now());

  protected readonly rankingFilters = computed(() => {
    const current = this.state.filters();
    return {
      ...current,
      dateFrom: current.dateFrom || this.defaultRange.dateFrom,
      dateTo: current.dateTo || this.defaultRange.dateTo,
    };
  });

  protected readonly ranking = this.stats.topSuppliers(() => ({
    filters: this.rankingFilters(),
    sort: this.currentSort(),
    limit: this.currentLimit(),
  }));

  protected readonly rankingData = computed(() =>
    this.ranking.hasValue() ? this.ranking.value() : undefined,
  );

  protected count(value: number): string {
    return formatCount(value);
  }

  protected isNatural(key: string): boolean {
    return isNaturalPerson(key);
  }

  protected typeLabel(key: string): string {
    return supplierTypeLabel(key);
  }

  protected setSort(newSort: TopSuppliersSort): void {
    this.router.navigate([], {
      queryParams: { sort: newSort === 'count' ? 'count' : null },
      queryParamsHandling: 'merge',
    });
  }

  protected setLimit(newLimit: number): void {
    this.router.navigate([], {
      queryParams: { limit: newLimit === 10 ? null : newLimit },
      queryParamsHandling: 'merge',
    });
  }
}
