import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ContractSummary, ProcessSummary, SortOrder } from '../../api/models';
import { SavedSearchesService } from '../../api/saved-searches.service';
import { ContractResults } from '../../shared/results/contract-results';
import { ProcessResults } from '../../shared/results/process-results';
import { BackLink } from '../../shared/ui/detail-parts';
import { FreshnessNote } from '../../shared/ui/freshness-note';
import { Pagination } from '../../shared/ui/pagination';
import { EmptyState, ErrorState, Skeleton } from '../../shared/ui/states';
import { savedFilterToQueryParams } from '../../shared/utils/filters';
import { formatCount } from '../../shared/utils/format';
import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_TONES,
  FREQUENCY_LABELS,
  SORT_LABELS,
  badgeClass,
} from '../../shared/utils/labels';
import { SavedSearchNames } from './saved-search-names';

type Tab = 'results' | 'deliveries';

/**
 * `/busquedas/:id` (destino de los emails de alerta; la ruta no cambia): resultados de la
 * búsqueda guardada y la pestaña "Historial de alertas".
 */
@Component({
  selector: 'app-saved-search-detail-page',
  imports: [
    DatePipe,
    RouterLink,
    BackLink,
    ProcessResults,
    ContractResults,
    Pagination,
    EmptyState,
    ErrorState,
    Skeleton,
    FreshnessNote,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-back-link link="/busquedas" label="Mis búsquedas" />

    @if (search.error(); as error) {
      <app-error-state
        [error]="error"
        heading="No pudimos abrir esta búsqueda"
        (retry)="search.reload()"
      />
    } @else if (current(); as s) {
      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
          <p class="text-xs font-semibold tracking-wider text-accent uppercase">
            {{ s.kind === 'processes' ? 'Licitaciones' : 'Contratos' }} · Alertas
            {{ frequencyLabels[s.frequency].toLowerCase() }}
            @if (s.isPaused) {
              (pausadas)
            }
          </p>
          <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ s.name }}</h1>
          <p class="mt-1 text-muted">{{ names.summary(s) }}</p>
        </div>
        <a
          class="btn-secondary"
          [routerLink]="s.kind === 'processes' ? '/licitaciones' : '/contratos'"
          [queryParams]="openParams()"
          >Abrir con filtros</a
        >
      </header>

      <div
        role="tablist"
        aria-label="Secciones de la búsqueda"
        class="mb-4 flex gap-1 border-b border-line"
      >
        @for (tab of tabs; track tab.id; let i = $index) {
          <button
            #tabButton
            type="button"
            role="tab"
            [id]="'tab-' + tab.id"
            [attr.aria-controls]="'panel-' + tab.id"
            [attr.aria-selected]="active() === tab.id"
            [tabindex]="active() === tab.id ? 0 : -1"
            class="-mb-px border-b-2 px-4 py-2 text-sm font-medium"
            [class]="
              active() === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink'
            "
            (click)="active.set(tab.id)"
            (keydown)="onTabKey($event, i)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      @if (active() === 'results') {
        <section id="panel-results" role="tabpanel" aria-labelledby="tab-results" class="space-y-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="font-medium tabular" aria-live="polite">
                @if (page(); as p) {
                  {{ p.totalCountIsCapped ? 'Más de ' : '' }}{{ count(p.totalCount) }} resultados
                }
              </p>
              @if (page(); as p) {
                <app-freshness-note [lastSyncedAt]="p.freshness.lastSyncedAt" />
              }
            </div>
            <label class="flex items-center gap-2 text-sm text-muted">
              Ordenar
              <select
                class="input w-auto py-1.5"
                [value]="sort()"
                (change)="setSort($any($event.target).value)"
              >
                @for (option of sorts(); track option) {
                  <option [value]="option">{{ sortLabels[option] }}</option>
                }
              </select>
            </label>
          </div>

          @if (results.error(); as error) {
            <app-error-state [error]="error" (retry)="results.reload()" />
          } @else if (page(); as p) {
            @if (p.items.length === 0) {
              <app-empty-state
                heading="Hoy no hay resultados para esta búsqueda"
                message="Te avisaremos cuando aparezcan."
              />
            } @else {
              <div class="transition-opacity" [class.opacity-60]="results.isLoading()">
                @if (s.kind === 'processes') {
                  <app-process-results [items]="processItems()" />
                } @else {
                  <app-contract-results [items]="contractItems()" />
                }
              </div>
              <app-pagination
                [page]="p.page"
                [pageSize]="p.pageSize"
                [total]="p.totalCount"
                [capped]="p.totalCountIsCapped"
                (pageChange)="resultsPage.set($event)"
                (pageSizeChange)="setPageSize($event)"
              />
            }
          } @else {
            <app-skeleton [rows]="6" />
          }
        </section>
      } @else {
        <section
          id="panel-deliveries"
          role="tabpanel"
          aria-labelledby="tab-deliveries"
          class="space-y-4"
        >
          @if (deliveries.error(); as error) {
            <app-error-state [error]="error" (retry)="deliveries.reload()" />
          } @else if (deliveries.hasValue()) {
            @let list = deliveries.value();
            @if (list.items.length === 0) {
              <app-empty-state
                heading="Sin alertas enviadas"
                [message]="
                  s.frequency === 'none'
                    ? 'Esta búsqueda no tiene alertas por email.'
                    : 'El primer email llegará cuando haya resultados nuevos.'
                "
              />
            } @else {
              <div class="card overflow-x-auto">
                <table class="table-base">
                  <caption class="sr-only">
                    Historial de alertas
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Ventana</th>
                      <th scope="col" class="text-end">Coincidencias</th>
                      <th scope="col" class="text-end">En el email</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Enviado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (delivery of list.items; track delivery.id) {
                      <tr>
                        <td class="tabular whitespace-nowrap">
                          {{ delivery.windowFrom | date }} – {{ delivery.windowTo | date }}
                        </td>
                        <td class="text-end tabular">{{ count(delivery.matches) }}</td>
                        <td class="text-end tabular">{{ count(delivery.included) }}</td>
                        <td>
                          <span [class]="toneClass(delivery.status)">{{
                            deliveryLabels[delivery.status]
                          }}</span>
                          @if (delivery.error) {
                            <span class="mt-1 block text-xs text-danger">{{ delivery.error }}</span>
                          }
                        </td>
                        <td class="tabular whitespace-nowrap">
                          {{ delivery.sentAt ? (delivery.sentAt | date: 'dd/MM/yyyy HH:mm') : '—' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <app-pagination
                [page]="list.page"
                [pageSize]="list.pageSize"
                [total]="list.totalCount"
                (pageChange)="deliveriesPage.set($event)"
                (pageSizeChange)="deliveriesSize.set($event); deliveriesPage.set(1)"
              />
            }
          } @else {
            <app-skeleton [rows]="4" />
          }
        </section>
      }
    } @else {
      <app-skeleton variant="block" [height]="120" />
    }
  `,
})
export class SavedSearchDetailPage {
  private readonly api = inject(SavedSearchesService);
  readonly id = input.required<string>();

  protected readonly tabs: { id: Tab; label: string }[] = [
    { id: 'results', label: 'Resultados' },
    { id: 'deliveries', label: 'Historial de alertas' },
  ];
  protected readonly frequencyLabels = FREQUENCY_LABELS;
  protected readonly deliveryLabels = DELIVERY_STATUS_LABELS;
  protected readonly sortLabels = SORT_LABELS;
  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  protected readonly active = signal<Tab>('results');
  protected readonly resultsPage = signal(1);
  private readonly resultsSize = signal(20);
  protected readonly sort = signal<SortOrder>('date_desc');
  protected readonly deliveriesPage = signal(1);
  protected readonly deliveriesSize = signal(20);

  protected readonly search = this.api.get(() => this.id());
  protected readonly current = computed(() =>
    this.search.hasValue() ? this.search.value() : undefined,
  );
  private readonly asList = computed(() => (this.current() ? [this.current()!] : []));
  protected readonly names = new SavedSearchNames(this.asList);

  protected readonly results = this.api.results(() =>
    this.current()
      ? { id: this.id(), page: this.resultsPage(), pageSize: this.resultsSize(), sort: this.sort() }
      : undefined,
  );
  protected readonly page = computed(() =>
    this.results.hasValue() ? this.results.value() : undefined,
  );
  /** La página trae procesos o contratos según el `kind` de la búsqueda. */
  protected readonly processItems = computed(() => (this.page()?.items ?? []) as ProcessSummary[]);
  protected readonly contractItems = computed(
    () => (this.page()?.items ?? []) as ContractSummary[],
  );

  protected readonly deliveries = this.api.deliveries(() =>
    this.active() === 'deliveries'
      ? { id: this.id(), page: this.deliveriesPage(), pageSize: this.deliveriesSize() }
      : undefined,
  );

  protected readonly sorts = computed<SortOrder[]>(() => {
    const base: SortOrder[] = ['date_desc', 'date_asc', 'amount_desc', 'amount_asc'];
    return this.current()?.kind === 'processes' ? [...base, 'deadline_asc'] : base;
  });

  protected readonly openParams = computed(() => {
    const current = this.current();
    return current ? savedFilterToQueryParams(current.filters) : {};
  });

  protected count(value: number): string {
    return formatCount(value);
  }

  protected toneClass(status: keyof typeof DELIVERY_STATUS_TONES): string {
    return badgeClass(DELIVERY_STATUS_TONES[status]);
  }

  protected setSort(value: SortOrder): void {
    this.sort.set(value);
    this.resultsPage.set(1);
  }

  protected setPageSize(size: number): void {
    this.resultsSize.set(size);
    this.resultsPage.set(1);
  }

  /** Flechas izquierda/derecha entre pestañas (patrón ARIA de tabs). */
  protected onTabKey(event: KeyboardEvent, index: number): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next =
      (index + (event.key === 'ArrowRight' ? 1 : -1) + this.tabs.length) % this.tabs.length;
    this.active.set(this.tabs[next].id);
    this.tabButtons()[next]?.nativeElement.focus();
  }
}
