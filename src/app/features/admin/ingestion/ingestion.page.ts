import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { IngestionService } from '../../../api/ingestion.service';
import { DATASET_KEYS, DatasetKey, IngestionRun, IngestionRunStatus } from '../../../api/models';
import { ScrapingService } from '../../../api/scraping.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { PageHeader } from '../../../shared/ui/page-header';
import { Pagination } from '../../../shared/ui/pagination';
import { ErrorState, Skeleton } from '../../../shared/ui/states';
import { formatCount } from '../../../shared/utils/format';
import {
  badgeClass,
  DATASET_LABELS,
  MODE_LABELS,
  RUN_STATUS_LABELS,
  RUN_STATUS_TONES,
} from '../../../shared/utils/labels';
import { RunForm } from './run-form';

/** Cada cuánto se refresca la tabla mientras haya runs en cola o en curso. */
export const RUNS_REFRESH_MS = 10_000;

export function hasActiveRuns(runs: readonly IngestionRun[]): boolean {
  return runs.some((run) => run.status === 'running' || run.status === 'queued');
}

/** `/admin/ingesta`: runs, checkpoints, lanzar un run y estado del scraping. */
@Component({
  selector: 'app-ingestion-page',
  imports: [DatePipe, PageHeader, Pagination, ErrorState, Skeleton, RunForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      heading="Ingesta"
      eyebrow="Administración"
      subtitle="Sincronización con los datasets de SECOP en datos.gov.co y estado del scraping opcional."
    />

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div class="min-w-0 space-y-6">
        <section aria-labelledby="checkpoints-title">
          <h2 id="checkpoints-title" class="section-title mb-3">Checkpoints</h2>
          @if (checkpoints.error(); as error) {
            <app-error-state [error]="error" (retry)="checkpoints.reload()" />
          } @else if (checkpoints.isLoading() && checkpoints.value().length === 0) {
            <app-skeleton variant="cards" [rows]="3" />
          } @else {
            <ul class="grid gap-4 sm:grid-cols-3">
              @for (checkpoint of checkpoints.value(); track checkpoint.datasetKey) {
                <li class="card p-4 text-sm">
                  <p class="font-semibold">{{ datasetLabels[checkpoint.datasetKey] }}</p>
                  <dl class="mt-2 space-y-1.5">
                    <div class="flex justify-between gap-2">
                      <dt class="text-muted">Último éxito</dt>
                      <dd class="tabular">
                        {{
                          checkpoint.lastSuccessAt
                            ? (checkpoint.lastSuccessAt | date: 'dd/MM HH:mm')
                            : '—'
                        }}
                      </dd>
                    </div>
                    <div class="flex justify-between gap-2">
                      <dt class="text-muted">Marca de agua</dt>
                      <dd class="tabular">
                        {{
                          checkpoint.watermark ? (checkpoint.watermark | date: 'dd/MM HH:mm') : '—'
                        }}
                      </dd>
                    </div>
                    <div class="flex justify-between gap-2">
                      <dt class="text-muted">Histórico</dt>
                      <dd>{{ checkpoint.backfillCompletedAt ? 'Completo' : 'Pendiente' }}</dd>
                    </div>
                  </dl>
                </li>
              }
            </ul>
          }
        </section>

        <section aria-labelledby="runs-title" class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 id="runs-title" class="section-title">
              Runs
              @if (autoRefresh()) {
                <span class="badge-warning ms-2 align-middle">Actualizando cada 10 s</span>
              }
            </h2>
            <div class="flex flex-wrap gap-2">
              <label class="sr-only" for="runs-dataset">Filtrar por dataset</label>
              <select
                id="runs-dataset"
                class="input w-auto py-1.5"
                [value]="datasetFilter() ?? ''"
                (change)="setDataset($any($event.target).value)"
              >
                <option value="">Todos los datasets</option>
                @for (key of datasets; track key) {
                  <option [value]="key">{{ datasetLabels[key] }}</option>
                }
              </select>
              <label class="sr-only" for="runs-status">Filtrar por estado</label>
              <select
                id="runs-status"
                class="input w-auto py-1.5"
                [value]="statusFilter() ?? ''"
                (change)="setStatus($any($event.target).value)"
              >
                <option value="">Todos los estados</option>
                @for (status of statuses; track status) {
                  <option [value]="status">{{ statusLabels[status] }}</option>
                }
              </select>
            </div>
          </div>

          @if (runs.error(); as error) {
            <app-error-state [error]="error" (retry)="runs.reload()" />
          } @else if (runs.hasValue()) {
            @let list = runs.value();
            <div class="card overflow-x-auto" aria-live="polite">
              <table class="table-base">
                <caption class="sr-only">
                  Runs de ingesta, del más reciente al más antiguo
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Dataset y modo</th>
                    <th scope="col">Estado</th>
                    <th scope="col" class="min-w-48">Progreso</th>
                    <th scope="col">En cola</th>
                    <th scope="col">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  @for (run of list.items; track run.id) {
                    <tr>
                      <td>
                        <p class="font-medium">{{ datasetLabels[run.datasetKey] }}</p>
                        <p class="text-xs text-muted">
                          {{ modeLabels[run.mode] }} · {{ run.requestedBy ?? 'sistema' }}
                        </p>
                      </td>
                      <td>
                        <span [class]="tone(run.status)">{{ statusLabels[run.status] }}</span>
                        @if (run.error) {
                          <p class="mt-1 max-w-xs text-xs text-danger">{{ run.error }}</p>
                        }
                      </td>
                      <td>
                        @if (run.status === 'running' || run.status === 'queued') {
                          <div
                            class="h-1.5 overflow-hidden rounded-full bg-sunken"
                            role="progressbar"
                            [attr.aria-label]="'Progreso de ' + datasetLabels[run.datasetKey]"
                            [attr.aria-valuetext]="count(run.rowsRead) + ' filas leídas'"
                          >
                            <div
                              class="h-full w-1/3 animate-pulse rounded-full bg-warning"
                              [class.w-full]="run.status === 'running'"
                            ></div>
                          </div>
                        }
                        <p class="mt-1 text-xs tabular">
                          {{ count(run.rowsRead) }} filas · {{ count(run.pages) }} págs.
                        </p>
                        <p class="text-xs text-muted tabular">
                          +{{ count(run.rowsInserted) }} nuevas · {{ count(run.rowsUpdated) }} act.
                          · {{ count(run.rowsRejected) }} rech.
                        </p>
                      </td>
                      <td class="tabular whitespace-nowrap">
                        {{ run.queuedAt | date: 'dd/MM HH:mm' }}
                      </td>
                      <td class="tabular whitespace-nowrap">{{ duration(run) }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="text-center text-muted">
                        No hay runs con estos filtros.
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
              (pageChange)="page.set($event)"
              (pageSizeChange)="pageSize.set($event); page.set(1)"
            />
          } @else {
            <app-skeleton [rows]="5" />
          }
        </section>
      </div>

      <div class="space-y-6">
        <app-run-form (queued)="onQueued($event)" />

        <section class="card p-5 text-sm" aria-labelledby="scraping-title">
          <h2 id="scraping-title" class="section-title">Scraping del portal SECOP II</h2>
          @if (scraping.error(); as error) {
            <div class="mt-3"><app-error-state [error]="error" (retry)="scraping.reload()" /></div>
          } @else if (scraping.hasValue()) {
            @let status = scraping.value();
            <p class="mt-3 flex items-center gap-2">
              <span [class]="status.enabled ? 'badge-success' : 'badge-neutral'">{{
                status.enabled ? 'Activo' : 'Apagado'
              }}</span>
              @if (status.blockedUntil) {
                <span class="badge-danger"
                  >Bloqueado hasta {{ status.blockedUntil | date: 'HH:mm' }}</span
                >
              }
            </p>
            @if (status.reason) {
              <p class="mt-2 text-muted">Motivo: {{ status.reason }}</p>
            }
            <dl class="mt-4 grid grid-cols-3 gap-2 text-center">
              <div class="rounded-md bg-success-soft p-2">
                <dt class="text-xs text-success">Éxitos 24 h</dt>
                <dd class="text-lg font-semibold tabular">{{ count(status.last24h.succeeded) }}</dd>
              </div>
              <div class="rounded-md bg-danger-soft p-2">
                <dt class="text-xs text-danger">Fallos</dt>
                <dd class="text-lg font-semibold tabular">{{ count(status.last24h.failed) }}</dd>
              </div>
              <div class="rounded-md bg-warning-soft p-2">
                <dt class="text-xs text-warning">Bloqueos</dt>
                <dd class="text-lg font-semibold tabular">{{ count(status.last24h.blocked) }}</dd>
              </div>
            </dl>
          } @else {
            <div class="mt-3"><app-skeleton variant="block" [height]="96" /></div>
          }
        </section>
      </div>
    </div>
  `,
})
export class IngestionPage {
  private readonly api = inject(IngestionService);
  private readonly toasts = inject(ToastService);

  protected readonly datasets = DATASET_KEYS;
  protected readonly statuses: IngestionRunStatus[] = [
    'queued',
    'running',
    'succeeded',
    'failed',
    'cancelled',
  ];
  protected readonly datasetLabels = DATASET_LABELS;
  protected readonly modeLabels = MODE_LABELS;
  protected readonly statusLabels = RUN_STATUS_LABELS;

  protected readonly datasetFilter = signal<DatasetKey | null>(null);
  protected readonly statusFilter = signal<IngestionRunStatus | null>(null);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);

  protected readonly runs = this.api.runs(() => ({
    datasetKey: this.datasetFilter(),
    status: this.statusFilter(),
    page: this.page(),
    pageSize: this.pageSize(),
  }));
  protected readonly checkpoints = this.api.checkpoints();
  protected readonly scraping = inject(ScrapingService).status();

  protected readonly autoRefresh = computed(
    () => this.runs.hasValue() && hasActiveRuns(this.runs.value().items),
  );

  constructor() {
    // Autorefresco cada 10 s solo mientras haya algo en cola o corriendo.
    effect((onCleanup) => {
      if (!this.autoRefresh()) return;
      const timer = setInterval(() => {
        this.runs.reload();
        this.checkpoints.reload();
      }, RUNS_REFRESH_MS);
      onCleanup(() => clearInterval(timer));
    });
  }

  protected tone(status: IngestionRunStatus): string {
    return badgeClass(RUN_STATUS_TONES[status]);
  }

  protected count(value: number): string {
    return formatCount(value);
  }

  protected duration(run: IngestionRun): string {
    if (!run.startedAt) return '—';
    const end = run.finishedAt ? Date.parse(run.finishedAt) : Date.now();
    const seconds = Math.max(0, Math.round((end - Date.parse(run.startedAt)) / 1000));
    if (seconds < 60) return `${seconds} s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ${seconds % 60} s`;
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  }

  protected setDataset(value: string): void {
    this.datasetFilter.set((value || null) as DatasetKey | null);
    this.page.set(1);
  }

  protected setStatus(value: string): void {
    this.statusFilter.set((value || null) as IngestionRunStatus | null);
    this.page.set(1);
  }

  protected onQueued(runId: string): void {
    this.toasts.show(
      'success',
      `Run encolado (${runId.slice(0, 8)}…). Verás su progreso en la tabla.`,
    );
    this.page.set(1);
    this.runs.reload();
  }
}
