import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { SearchKind, StatsInterval } from '../../api/models';
import { StatsService } from '../../api/stats.service';
import { ThemeService } from '../../core/theme/theme.service';
import { ChartCard, ChartPoint } from '../../shared/charts/chart-card';
import { chartPalette } from '../../shared/charts/chart-theme';
import { FilterLookups, provideFilters } from '../../shared/filter-bar/filter-context';
import { FilterPanel } from '../../shared/filter-bar/filter-panel';
import { FilterSearch } from '../../shared/filter-bar/filter-search';
import { CopCurrencyPipe } from '../../shared/pipes/cop-currency.pipe';
import { FreshnessNote } from '../../shared/ui/freshness-note';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';
import { ErrorState, Skeleton } from '../../shared/ui/states';
import { FilterStateService } from '../../shared/utils/filter-state.service';
import { formatCop, formatCopCompact, formatCount } from '../../shared/utils/format';
import {
  Bar,
  barAt,
  barsTable,
  horizontalBarOptions,
  periodEnd,
  timeSeriesOptions,
  timeSeriesTable,
} from './dashboard-charts';

const INTERVALS: { value: StatsInterval; label: string }[] = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

/**
 * `/`: KPIs, serie temporal, industrias, departamentos (con bajada a municipios) y top de
 * entidades. Los clics en las gráficas aplican el filtro; por defecto, los últimos 12 meses.
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [
    DatePipe,
    RouterLink,
    CopCurrencyPipe,
    PageHeader,
    FilterPanel,
    FilterSearch,
    KpiCard,
    ChartCard,
    ErrorState,
    Skeleton,
    FreshnessNote,
  ],
  providers: [provideFilters('stats')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header heading="Panel" subtitle="Cómo se mueve la compra pública según tus filtros.">
      <div
        class="inline-flex rounded-md border border-line bg-raised p-0.5"
        role="group"
        aria-label="Tipo de registro"
      >
        @for (option of kinds; track option.value) {
          <button
            type="button"
            class="rounded px-3 py-1.5 text-sm font-medium"
            [class]="
              currentKind() === option.value
                ? 'bg-accent text-on-accent'
                : 'text-muted hover:text-ink'
            "
            [attr.aria-pressed]="currentKind() === option.value"
            (click)="setKind(option.value)"
          >
            {{ option.label }}
          </button>
        }
      </div>
    </app-page-header>

    <div class="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      <app-filter-panel [dateField]="currentKind() === 'contracts' ? 'signed' : 'published'" />

      <div class="min-w-0 space-y-6">
        <app-filter-search />

        <section aria-label="Indicadores" aria-live="polite">
          @if (summary.error(); as error) {
            <app-error-state [error]="error" (retry)="summary.reload()" />
          } @else if (summaryValue(); as s) {
            <div
              class="grid gap-4 sm:grid-cols-2"
              [class]="currentKind() === 'processes' ? 'xl:grid-cols-4' : 'xl:grid-cols-3'"
            >
              <app-kpi-card
                [label]="currentKind() === 'contracts' ? 'Contratos' : 'Procesos'"
                [value]="count(s.count)"
                [note]="'Del ' + (s.dateFrom | date) + ' al ' + (s.dateTo | date)"
                [accent]="true"
              />
              <app-kpi-card
                label="Monto total"
                [value]="compact(s.totalAmount)"
                [note]="full(s.totalAmount)"
              />
              @if (currentKind() === 'processes') {
                <app-kpi-card
                  label="Vigentes"
                  [value]="count(s.activeCount)"
                  note="Abiertos, competitivos y sin cerrar"
                />
                <app-kpi-card
                  label="Adjudicados"
                  [value]="count(s.awardedCount)"
                  [note]="s.totalAwarded !== null ? 'Por ' + compact(s.totalAwarded) : undefined"
                />
              } @else {
                <app-kpi-card
                  label="Valor promedio"
                  [value]="compact(s.count ? s.totalAmount / s.count : null)"
                  note="Monto total entre contratos"
                />
              }
            </div>
            <div class="mt-2 flex flex-wrap gap-x-4 text-xs text-muted">
              <app-freshness-note [lastSyncedAt]="s.freshness.lastSyncedAt" />
              @if (s.freshness.statsRefreshedAt) {
                <p>
                  Estadísticas recalculadas el
                  {{ s.freshness.statsRefreshedAt | date: 'dd/MM/yyyy HH:mm' }}
                </p>
              }
            </div>
          } @else {
            <app-skeleton variant="cards" [rows]="4" />
          }
        </section>

        <app-chart-card
          heading="Evolución"
          [description]="
            'Registros por ' + intervalLabel() + '. Haz clic en un periodo para filtrarlo.'
          "
          [options]="timeSeriesOptions()"
          [table]="timeSeriesTableData()"
          [loading]="timeSeries.isLoading()"
          [error]="timeSeries.error()"
          [empty]="timeSeriesEmpty()"
          (pointClick)="onPeriodClick($event)"
          (retry)="timeSeries.reload()"
        >
          <div
            slot="actions"
            class="inline-flex rounded-md border border-line p-0.5"
            role="group"
            aria-label="Agrupar por"
          >
            @for (option of intervals; track option.value) {
              <button
                type="button"
                class="rounded px-2.5 py-1 text-xs font-medium"
                [class]="
                  currentInterval() === option.value
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink'
                "
                [attr.aria-pressed]="currentInterval() === option.value"
                (click)="setInterval(option.value)"
              >
                {{ option.label }}
              </button>
            }
          </div>
        </app-chart-card>

        <div class="grid gap-6 xl:grid-cols-2">
          <app-chart-card
            heading="Por industria"
            description="Un registro con varias industrias cuenta en cada una."
            [options]="industryOptions()"
            [table]="industryTable()"
            [loading]="byIndustry.isLoading()"
            [error]="byIndustry.error()"
            [empty]="industryBars().length === 0"
            [height]="340"
            (pointClick)="onIndustryClick($event)"
            (retry)="byIndustry.reload()"
          />

          <app-chart-card
            [heading]="
              locationLevel() === 'municipality'
                ? 'Por municipio · ' + drilledDepartment()
                : 'Por departamento'
            "
            [description]="
              locationLevel() === 'municipality'
                ? 'Haz clic en un municipio para filtrarlo.'
                : 'Haz clic en un departamento para ver sus municipios.'
            "
            [options]="locationOptions()"
            [table]="locationTable()"
            [loading]="byLocation.isLoading()"
            [error]="byLocation.error()"
            [empty]="locationBars().length === 0"
            [height]="340"
            (pointClick)="onLocationClick($event)"
            (retry)="byLocation.reload()"
          >
            @if (locationLevel() === 'municipality') {
              <button
                slot="actions"
                type="button"
                class="btn-ghost px-2 py-1 text-xs"
                (click)="backToDepartments()"
              >
                ← Departamentos
              </button>
            }
          </app-chart-card>
        </div>

        <section class="card p-4 sm:p-5" aria-labelledby="top-entities-title">
          <h2 id="top-entities-title" class="section-title">Entidades con más registros</h2>
          @if (topEntities.error(); as error) {
            <div class="mt-4">
              <app-error-state [error]="error" (retry)="topEntities.reload()" />
            </div>
          } @else if (topEntities.hasValue()) {
            <div class="mt-3 overflow-x-auto">
              <table class="table-base">
                <caption class="sr-only">
                  Entidades contratantes con más registros
                </caption>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Entidad</th>
                    <th scope="col" class="text-end">Registros</th>
                    <th scope="col" class="text-end">Monto total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (entity of entityRows(); track entity.entityName; let i = $index) {
                    <tr>
                      <td class="text-muted tabular">{{ i + 1 }}</td>
                      <td>
                        <a
                          class="link"
                          [routerLink]="
                            currentKind() === 'contracts' ? '/contratos' : '/licitaciones'
                          "
                          [queryParams]="{ entity: entity.entityName }"
                          >{{ entity.entityName }}</a
                        >
                        @if (entity.entityNit) {
                          <span class="block text-xs text-muted">NIT {{ entity.entityNit }}</span>
                        }
                      </td>
                      <td class="text-end tabular">{{ count(entity.count) }}</td>
                      <td class="text-end tabular">{{ entity.totalAmount | copCurrency }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="text-center text-muted">
                        Sin datos para estos filtros.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="mt-4"><app-skeleton [rows]="5" /></div>
          }
        </section>
      </div>
    </div>
  `,
})
export class DashboardPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly stats = inject(StatsService);
  private readonly theme = inject(ThemeService);
  private readonly lookups = inject(FilterLookups);
  protected readonly state = inject(FilterStateService);

  /** Query params `kind` e `interval` (enlazados por `withComponentInputBinding`). */
  readonly kind = input<string>();
  readonly interval = input<string>();

  protected readonly kinds: { value: SearchKind; label: string }[] = [
    { value: 'processes', label: 'Procesos' },
    { value: 'contracts', label: 'Contratos' },
  ];
  protected readonly intervals = INTERVALS;

  protected readonly currentKind = computed<SearchKind>(() =>
    this.kind() === 'contracts' ? 'contracts' : 'processes',
  );
  protected readonly currentInterval = computed<StatsInterval>(() =>
    INTERVALS.some((i) => i.value === this.interval())
      ? (this.interval() as StatsInterval)
      : 'month',
  );
  protected readonly intervalLabel = computed(
    () => ({ day: 'día', week: 'semana', month: 'mes' })[this.currentInterval()],
  );

  private readonly query = computed(() => ({
    filters: this.state.filters(),
    kind: this.currentKind(),
  }));
  /** Con un solo departamento filtrado, el gráfico de ubicación baja a municipios. */
  protected readonly locationLevel = computed(() =>
    this.state.filters().department.length === 1 ? 'municipality' : 'department',
  );
  protected readonly drilledDepartment = computed(() =>
    this.lookups.departmentName(this.state.filters().department[0] ?? ''),
  );

  protected readonly summary = this.stats.summary(() => this.query());
  protected readonly timeSeries = this.stats.timeSeries(() => ({
    ...this.query(),
    interval: this.currentInterval(),
  }));
  protected readonly byIndustry = this.stats.byIndustry(() => this.query());
  protected readonly byLocation = this.stats.byLocation(() => ({
    ...this.query(),
    level: this.locationLevel(),
  }));
  protected readonly topEntities = this.stats.topEntities(() => ({ ...this.query(), limit: 10 }));

  private readonly palette = computed(() => chartPalette(this.theme.isDark()));

  protected readonly summaryValue = computed(() =>
    this.summary.hasValue() ? this.summary.value() : undefined,
  );
  private readonly points = computed(() =>
    this.timeSeries.hasValue() ? this.timeSeries.value().items : [],
  );
  protected readonly timeSeriesEmpty = computed(
    () => this.timeSeries.hasValue() && this.points().every((p) => p.count === 0),
  );
  protected readonly timeSeriesOptions = computed(() =>
    timeSeriesOptions(this.points(), this.currentInterval(), this.palette()),
  );
  protected readonly timeSeriesTableData = computed(() =>
    this.timeSeries.hasValue() ? timeSeriesTable(this.points(), this.currentInterval()) : null,
  );

  protected readonly industryBars = computed<Bar[]>(() =>
    (this.byIndustry.hasValue() ? this.byIndustry.value().items : []).slice(0, 12).map((b) => ({
      key: b.industryId,
      label: b.industryName,
      count: b.count,
      totalAmount: b.totalAmount,
    })),
  );
  protected readonly industryOptions = computed(() =>
    horizontalBarOptions(this.industryBars(), this.palette(), 0),
  );
  protected readonly industryTable = computed(() =>
    this.byIndustry.hasValue() ? barsTable(this.industryBars(), 'Industria') : null,
  );

  protected readonly locationBars = computed<Bar[]>(() =>
    (this.byLocation.hasValue() ? this.byLocation.value().items : []).slice(0, 12).map((b) => ({
      key: b.code,
      label: b.name ?? 'Sin ubicación normalizada',
      count: b.count,
      totalAmount: b.totalAmount,
    })),
  );
  protected readonly locationOptions = computed(() =>
    horizontalBarOptions(this.locationBars(), this.palette(), 1),
  );
  protected readonly locationTable = computed(() =>
    this.byLocation.hasValue()
      ? barsTable(
          this.locationBars(),
          this.locationLevel() === 'municipality' ? 'Municipio' : 'Departamento',
        )
      : null,
  );

  protected readonly entityRows = computed(() =>
    this.topEntities.hasValue() ? this.topEntities.value().items : [],
  );

  constructor() {
    // Los facets de la barra de filtros deben contar el mismo tipo de registro que el panel.
    effect(() => this.lookups.statsKind.set(this.currentKind()));
  }

  protected count(value: number | null | undefined): string {
    return formatCount(value);
  }

  protected compact(value: number | null | undefined): string {
    return formatCopCompact(value);
  }

  protected full(value: number | null | undefined): string {
    return formatCop(value);
  }

  protected setKind(kind: SearchKind): void {
    // Los estados de procesos y contratos son distintos: se limpian al cambiar.
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { kind: kind === 'processes' ? null : kind, status: null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected setInterval(interval: StatsInterval): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { interval: interval === 'month' ? null : interval },
      queryParamsHandling: 'merge',
    });
  }

  protected onPeriodClick(point: ChartPoint): void {
    const period = this.points()[point.dataIndex];
    if (!period) return;
    void this.state.update({
      dateFrom: period.periodStart,
      dateTo: periodEnd(period.periodStart, this.currentInterval()),
    });
  }

  protected onIndustryClick(point: ChartPoint): void {
    const bar = barAt(this.industryBars(), point.dataIndex);
    if (bar?.key) void this.state.update({ industry: [bar.key] });
  }

  protected onLocationClick(point: ChartPoint): void {
    const bar = barAt(this.locationBars(), point.dataIndex);
    if (!bar?.key) return;
    if (this.locationLevel() === 'municipality') {
      void this.state.update({ municipality: [bar.key] });
    } else {
      void this.state.update({ department: [bar.key] });
    }
  }

  protected backToDepartments(): void {
    void this.state.update({ department: [], municipality: [] });
  }
}
