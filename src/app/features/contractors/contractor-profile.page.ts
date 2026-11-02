import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ContractsService } from '../../api/contracts.service';
import { StatsService } from '../../api/stats.service';
import { HasRoleDirective } from '../../core/auth/has-role.directive';
import { ThemeService } from '../../core/theme/theme.service';
import { ChartCard } from '../../shared/charts/chart-card';
import { chartPalette } from '../../shared/charts/chart-theme';
import { CopCurrencyPipe } from '../../shared/pipes/cop-currency.pipe';
import { ExportButton } from '../../shared/saved-search/export-button';
import { SourceBadge, StatusBadge } from '../../shared/ui/badges';
import { BackLink } from '../../shared/ui/detail-parts';
import { FreshnessNote } from '../../shared/ui/freshness-note';
import { KpiCard } from '../../shared/ui/kpi-card';
import { Pagination } from '../../shared/ui/pagination';
import { LocationCell } from '../../shared/ui/record-cells';
import { EmptyState, ErrorState, Skeleton } from '../../shared/ui/states';
import { defaultDateRange, SearchFilters, withDefaults } from '../../shared/utils/filters';
import { formatCop, formatCount } from '../../shared/utils/format';
import { decodeSupplierKey, isNaturalPerson, supplierTypeLabel } from '../../shared/utils/supplier';
import {
  Bar,
  barsTable,
  horizontalBarOptions,
  timeSeriesOptions,
  timeSeriesTable,
} from '../dashboard/dashboard-charts';

/**
 * `/contratistas/:supplierKey`: Ficha integral de contratista (SPEC 16).
 * Incluye metadatos históricos, indicadores del periodo, serie temporal mensual,
 * principales entidades contratantes, distribución por industria y departamento,
 * y explorador de contratos firmados con exportación a CSV.
 */
@Component({
  selector: 'app-contractor-profile-page',
  imports: [
    DatePipe,
    RouterLink,
    CopCurrencyPipe,
    BackLink,
    SourceBadge,
    StatusBadge,
    LocationCell,
    KpiCard,
    ChartCard,
    ExportButton,
    Pagination,
    FreshnessNote,
    EmptyState,
    ErrorState,
    Skeleton,
    HasRoleDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-back-link link="/estadisticas/contratistas" label="Volver al ranking de contratistas" />

    @if (profile.error(); as error) {
      <div class="card p-6">
        @if (isNotFound()) {
          <app-empty-state
            heading="Contratista no encontrado"
            message="No existe ningún contratista registrado con este identificador o no cuenta con contratos firmados en el sistema."
          >
            <div class="mt-4">
              <a routerLink="/estadisticas/contratistas" class="btn-primary">
                Ver ranking de contratistas
              </a>
            </div>
          </app-empty-state>
        } @else {
          <app-error-state
            [error]="error"
            heading="No pudimos cargar la ficha de este contratista"
            (retry)="profile.reload()"
          />
        }
      </div>
    } @else if (profileData(); as p) {
      <article class="space-y-6">
        <!-- Tarjeta de cabecera del contratista -->
        <header class="card p-5 sm:p-6">
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge-accent font-semibold">{{ typeLabel() }}</span>
            @if (p.isSme) {
              <span class="badge-info font-medium">Mipyme ✓</span>
            }
            @for (src of p.sources; track src) {
              <app-source-badge [source]="$any(src)" />
            }
          </div>

          <h1 class="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {{ p.supplierName }}
          </h1>

          <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            @if (p.supplierNit) {
              <span>NIT {{ p.supplierNit }}</span>
            } @else {
              <span>Sin NIT publicado</span>
            }
          </div>

          @if (isNatural()) {
            <div
              class="mt-4 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft p-3.5 text-xs text-warning"
              role="note"
            >
              <svg
                class="size-4 shrink-0 mt-0.5 text-warning"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <div>
                <p class="font-semibold text-ink">Perfil agrupado por nombre (sin NIT publicado)</p>
                <p class="mt-0.5 leading-relaxed">
                  En Colombia, la contratación de prestación de servicios suele publicarse sin
                  cédula. Si existen homónimos (distintas personas naturales con el mismo nombre),
                  sus contratos se consolidan en este perfil.
                </p>
              </div>
            </div>
          }

          <!-- Metadatos de todo el histórico -->
          <div class="mt-5 border-t border-line pt-4">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-muted">
              Histórico total acumulado (SECOP I y II)
            </h2>
            <dl class="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div class="card bg-sunken/40 p-3">
                <dt class="text-xs text-muted">Contratos totales</dt>
                <dd class="mt-1 text-xl font-bold tabular text-ink">{{ count(p.count) }}</dd>
              </div>
              <div class="card bg-sunken/40 p-3">
                <dt class="text-xs text-muted">Monto total firmado</dt>
                <dd class="mt-1 text-xl font-bold tabular text-accent">
                  {{ p.totalAmount | copCurrency }}
                </dd>
              </div>
              <div class="card bg-sunken/40 p-3">
                <dt class="text-xs text-muted">Primer contrato firmado</dt>
                <dd class="mt-1 text-sm font-semibold tabular text-ink">
                  {{ p.firstSignedAt ? (p.firstSignedAt | date) : '—' }}
                </dd>
              </div>
              <div class="card bg-sunken/40 p-3">
                <dt class="text-xs text-muted">Último contrato firmado</dt>
                <dd class="mt-1 text-sm font-semibold tabular text-ink">
                  {{ p.lastSignedAt ? (p.lastSignedAt | date) : '—' }}
                </dd>
              </div>
            </dl>
          </div>
        </header>

        <!-- Filtro de período para los bloques analíticos -->
        <section class="card p-4" aria-label="Filtro de periodo">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-wider text-muted">
                Periodo de análisis:
              </span>
              <div class="inline-flex rounded-md border border-line p-0.5" role="group">
                @for (preset of periodPresets; track preset.id) {
                  <button
                    type="button"
                    class="rounded px-2.5 py-1 text-xs font-medium"
                    [class]="
                      currentPreset() === preset.id
                        ? 'bg-accent text-on-accent'
                        : 'text-muted hover:text-ink'
                    "
                    (click)="applyPreset(preset.id)"
                  >
                    {{ preset.label }}
                  </button>
                }
              </div>
            </div>

            <p class="text-xs text-muted">
              Del <span class="font-medium text-ink">{{ dateFrom() }}</span> al
              <span class="font-medium text-ink">{{ dateTo() }}</span>
            </p>
          </div>
        </section>

        <!-- Indicadores de desempeño en el periodo seleccionado -->
        <section aria-label="Indicadores del periodo" aria-live="polite">
          @if (summary.error(); as err) {
            <app-error-state [error]="err" (retry)="summary.reload()" />
          } @else if (summaryValue(); as s) {
            <div class="grid gap-4 sm:grid-cols-3">
              <app-kpi-card
                label="Contratos en periodo"
                [value]="count(s.count)"
                note="Contratos firmados en las fechas elegidas"
                [accent]="true"
              />
              <app-kpi-card
                label="Monto total en periodo"
                [value]="s.totalAmount | copCurrency"
                note="Suma de valor firmado"
              />
              <app-kpi-card
                label="Valor promedio"
                [value]="compactCop(s.count ? s.totalAmount / s.count : null)"
                note="Monto entre contratos"
              />
            </div>
          } @else {
            <app-skeleton variant="cards" [rows]="3" />
          }
        </section>

        <!-- Gráfico de tendencia mensual -->
        <app-chart-card
          heading="Evolución mensual"
          description="Contratos firmados mes a mes en el periodo seleccionado."
          [options]="timeSeriesChartOptions()"
          [table]="timeSeriesTableData()"
          [loading]="timeSeries.isLoading()"
          [error]="timeSeries.error()"
          [empty]="timeSeriesEmpty()"
          (retry)="timeSeries.reload()"
        />

        <!-- Desglose por entidades y desgloses secundarios -->
        <div class="grid gap-6 lg:grid-cols-2">
          <!-- Principales entidades contratantes -->
          <section class="card p-5" aria-labelledby="top-entities-title">
            <h2 id="top-entities-title" class="section-title">
              Principales entidades contratantes
            </h2>
            <p class="mt-1 text-xs text-muted">
              Entidades públicas que más han contratado a este proveedor.
            </p>

            @if (topEntities.error(); as err) {
              <div class="mt-4">
                <app-error-state [error]="err" (retry)="topEntities.reload()" />
              </div>
            } @else if (topEntities.hasValue()) {
              <div class="mt-4 overflow-x-auto">
                <table class="table-base">
                  <thead>
                    <tr>
                      <th scope="col" class="w-8">#</th>
                      <th scope="col">Entidad</th>
                      <th scope="col" class="text-end">Contratos</th>
                      <th scope="col" class="text-end">Monto total</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (entity of entityRows(); track entity.entityName; let i = $index) {
                      <tr>
                        <td class="text-muted tabular">{{ i + 1 }}</td>
                        <td>
                          <span class="font-medium text-ink">{{ entity.entityName }}</span>
                          @if (entity.entityNit) {
                            <span class="block text-xs text-muted">NIT {{ entity.entityNit }}</span>
                          }
                        </td>
                        <td class="text-end font-medium tabular">{{ count(entity.count) }}</td>
                        <td class="text-end font-semibold tabular">
                          {{ entity.totalAmount | copCurrency }}
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="4" class="text-center text-muted">
                          Sin entidades registradas en este periodo.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="mt-4"><app-skeleton [rows]="4" /></div>
            }
          </section>

          <!-- Distribución por industrias -->
          <app-chart-card
            heading="Por industria"
            description="Líneas de negocio o bienes contratados según código UNSPSC."
            [options]="industryOptions()"
            [table]="industryTable()"
            [loading]="byIndustry.isLoading()"
            [error]="byIndustry.error()"
            [empty]="industryBars().length === 0"
            [height]="320"
            (retry)="byIndustry.reload()"
          />
        </div>

        <!-- Distribución geográfica -->
        <app-chart-card
          heading="Distribución geográfica por departamento"
          description="Departamentos donde se ejecutaron los contratos de este proveedor."
          [options]="locationOptions()"
          [table]="locationTable()"
          [loading]="byLocation.isLoading()"
          [error]="byLocation.error()"
          [empty]="locationBars().length === 0"
          [height]="320"
          (retry)="byLocation.reload()"
        />

        <!-- Explorador de contratos firmados del contratista -->
        <section class="space-y-4" aria-labelledby="contratos-list-title">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="contratos-list-title" class="text-xl font-bold tracking-tight text-ink">
                Contratos firmados
              </h2>
              <p class="text-xs text-muted">
                Listado histórico completo de contratos adjudicados y suscritos.
              </p>
            </div>

            <div *appHasRole="'procurement:export'">
              <app-export-button kind="contracts" [filters]="exportFilters()" />
            </div>
          </div>

          @if (contracts.error(); as err) {
            <app-error-state [error]="err" (retry)="contracts.reload()" />
          } @else if (contractsPage(); as pageData) {
            @if (pageData.items.length === 0) {
              <div class="card p-6">
                <app-empty-state
                  heading="No hay contratos firmados"
                  message="No se encontraron contratos registrados para este contratista."
                />
              </div>
            } @else {
              <!-- Tabla de contratos -->
              <div class="card hidden overflow-x-auto md:block">
                <table class="table-base">
                  <thead>
                    <tr>
                      <th scope="col" class="w-[38%]">Contrato / Objeto</th>
                      <th scope="col">Entidad contratante</th>
                      <th scope="col">Municipio</th>
                      <th scope="col" class="text-end">Monto</th>
                      <th scope="col">Fecha de firma</th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of pageData.items; track c.source + c.sourceId) {
                      <tr class="hover:bg-sunken/60">
                        <td>
                          <a
                            class="font-medium text-ink hover:text-accent hover:underline"
                            [routerLink]="['/contratos', c.source, c.sourceId]"
                            >{{ c.description }}</a
                          >
                          @if (c.reference) {
                            <p class="mt-0.5 text-xs text-muted">Ref: {{ c.reference }}</p>
                          }
                        </td>
                        <td class="text-sm text-ink">
                          {{ c.entityName }}
                        </td>
                        <td>
                          <app-location-cell [location]="c.location" />
                        </td>
                        <td class="text-end font-semibold tabular">
                          {{ c.value | copCurrency }}
                        </td>
                        <td class="whitespace-nowrap tabular text-sm">
                          {{ c.signedAt ? (c.signedAt | date) : '—' }}
                        </td>
                        <td>
                          <app-status-badge [status]="c.status" />
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Tarjetas en móvil -->
              <ul class="space-y-3 md:hidden" aria-label="Contratos firmados del contratista">
                @for (c of pageData.items; track c.source + c.sourceId) {
                  <li class="card p-4">
                    <div class="flex items-start justify-between gap-2">
                      <app-status-badge [status]="c.status" />
                      <span class="text-xs text-muted tabular">{{ c.signedAt | date }}</span>
                    </div>

                    <a
                      class="mt-2 block font-medium hover:text-accent hover:underline"
                      [routerLink]="['/contratos', c.source, c.sourceId]"
                      >{{ c.description }}</a
                    >

                    <p class="mt-1 text-sm text-muted">{{ c.entityName }}</p>

                    <dl class="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt class="text-xs text-muted">Monto</dt>
                        <dd class="font-semibold tabular">{{ c.value | copCurrency }}</dd>
                      </div>
                      <div>
                        <dt class="text-xs text-muted">Ubicación</dt>
                        <dd><app-location-cell [location]="c.location" /></dd>
                      </div>
                    </dl>
                  </li>
                }
              </ul>

              <app-pagination
                [page]="page()"
                [pageSize]="pageSize()"
                [total]="pageData.totalCount"
                [capped]="pageData.totalCountIsCapped"
                (pageChange)="page.set($event)"
                (pageSizeChange)="onPageSizeChange($event)"
              />
            }
          } @else {
            <app-skeleton variant="cards" [rows]="4" />
          }
        </section>

        <!-- Notas de frescura -->
        <div class="mt-6 flex flex-wrap gap-x-4 text-xs text-muted">
          @if (p.freshness.lastSyncedAt) {
            <app-freshness-note [lastSyncedAt]="p.freshness.lastSyncedAt" />
          }
          @if (p.freshness.statsRefreshedAt) {
            <p>
              Estadísticas recalculadas el
              {{ p.freshness.statsRefreshedAt | date: 'dd/MM/yyyy HH:mm' }}
            </p>
          }
        </div>
      </article>
    } @else {
      <div class="space-y-6">
        <app-skeleton variant="block" [height]="220" />
        <app-skeleton variant="cards" [rows]="3" />
        <app-skeleton variant="block" [height]="340" />
      </div>
    }
  `,
})
export class ContractorProfilePage {
  private readonly stats = inject(StatsService);
  private readonly contractsService = inject(ContractsService);
  private readonly theme = inject(ThemeService);

  readonly supplierKey = input.required<string>();

  protected readonly decodedKey = computed(() => decodeSupplierKey(this.supplierKey()));

  protected readonly isNatural = computed(() => isNaturalPerson(this.decodedKey()));
  protected readonly typeLabel = computed(() => supplierTypeLabel(this.decodedKey()));

  // Paginación de contratos
  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);

  // Periodos para bloques estadísticos
  protected readonly periodPresets = [
    { id: '1y', label: 'Último año' },
    { id: '3y', label: 'Últimos 3 años' },
  ] as const;
  protected readonly currentPreset = signal<'1y' | '3y'>('1y');

  private readonly initialRange = defaultDateRange(Date.now());
  protected readonly dateFrom = signal<string>(this.initialRange.dateFrom);
  protected readonly dateTo = signal<string>(this.initialRange.dateTo);

  // Recurso de cabecera histórica
  protected readonly profile = this.stats.supplierProfile(() => this.decodedKey());
  protected readonly profileData = computed(() =>
    this.profile.hasValue() ? this.profile.value() : undefined,
  );
  protected readonly isNotFound = computed(
    () => (this.profile.error() as { status?: number } | undefined)?.status === 404,
  );

  // Filtros para las consultas de estadísticas asociadas a este contratista
  private readonly statsFilters = computed<SearchFilters>(() => ({
    ...withDefaults(),
    dateFrom: this.dateFrom(),
    dateTo: this.dateTo(),
    supplier: this.decodedKey(),
  }));

  // Bloques estadísticos
  protected readonly summary = this.stats.summary(() => ({
    filters: this.statsFilters(),
    kind: 'contracts',
    supplier: this.decodedKey(),
  }));
  protected readonly summaryValue = computed(() =>
    this.summary.hasValue() ? this.summary.value() : undefined,
  );

  protected readonly timeSeries = this.stats.timeSeries(() => ({
    filters: this.statsFilters(),
    kind: 'contracts',
    supplier: this.decodedKey(),
    interval: 'month',
  }));
  private readonly points = computed(() =>
    this.timeSeries.hasValue() ? this.timeSeries.value().items : [],
  );
  protected readonly timeSeriesEmpty = computed(
    () => this.timeSeries.hasValue() && this.points().every((p) => p.count === 0),
  );

  private readonly palette = computed(() => chartPalette(this.theme.isDark()));

  protected readonly timeSeriesChartOptions = computed(() =>
    timeSeriesOptions(this.points(), 'month', this.palette()),
  );
  protected readonly timeSeriesTableData = computed(() =>
    this.timeSeries.hasValue() ? timeSeriesTable(this.points(), 'month') : null,
  );

  protected readonly topEntities = this.stats.topEntities(() => ({
    filters: this.statsFilters(),
    kind: 'contracts',
    supplier: this.decodedKey(),
    limit: 10,
  }));
  protected readonly entityRows = computed(() =>
    this.topEntities.hasValue() ? this.topEntities.value().items : [],
  );

  protected readonly byIndustry = this.stats.byIndustry(() => ({
    filters: this.statsFilters(),
    kind: 'contracts',
    supplier: this.decodedKey(),
  }));
  protected readonly industryBars = computed<Bar[]>(() =>
    (this.byIndustry.hasValue() ? this.byIndustry.value().items : []).slice(0, 8).map((b) => ({
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

  protected readonly byLocation = this.stats.byLocation(() => ({
    filters: this.statsFilters(),
    kind: 'contracts',
    supplier: this.decodedKey(),
    level: 'department',
  }));
  protected readonly locationBars = computed<Bar[]>(() =>
    (this.byLocation.hasValue() ? this.byLocation.value().items : []).slice(0, 8).map((b) => ({
      key: b.code ?? '',
      label: b.name ?? b.code ?? '',
      count: b.count,
      totalAmount: b.totalAmount,
    })),
  );
  protected readonly locationOptions = computed(() =>
    horizontalBarOptions(this.locationBars(), this.palette(), 0),
  );
  protected readonly locationTable = computed(() =>
    this.byLocation.hasValue() ? barsTable(this.locationBars(), 'Departamento') : null,
  );

  // Lista de contratos
  protected readonly contractsListFilters = computed<SearchFilters>(() => ({
    ...withDefaults(),
    supplier: this.decodedKey(),
    page: this.page(),
    pageSize: this.pageSize(),
    sort: 'date_desc',
  }));

  protected readonly contracts = this.contractsService.list(() => this.contractsListFilters());
  protected readonly contractsPage = computed(() =>
    this.contracts.hasValue() ? this.contracts.value() : undefined,
  );

  protected readonly exportFilters = computed<SearchFilters>(() => ({
    ...withDefaults(),
    supplier: this.decodedKey(),
    sort: 'date_desc',
  }));

  protected applyPreset(preset: '1y' | '3y'): void {
    this.currentPreset.set(preset);
    const now = Date.now();
    const dateTo = new Date(now - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const [y, m, d] = dateTo.split('-').map(Number);
    const yearsBack = preset === '3y' ? 3 : 1;
    const from = new Date(Date.UTC(y - yearsBack, m - 1, d));
    from.setUTCDate(from.getUTCDate() + 1);
    this.dateFrom.set(from.toISOString().slice(0, 10));
    this.dateTo.set(dateTo);
  }

  protected onPageSizeChange(newSize: number): void {
    this.pageSize.set(newSize);
    this.page.set(1);
  }

  protected count(value: number): string {
    return formatCount(value);
  }

  protected compactCop(value: number | null): string {
    return value !== null ? formatCop(value) : '—';
  }
}
