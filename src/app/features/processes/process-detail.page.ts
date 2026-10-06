import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { ProcessesService } from '../../api/processes.service';
import { CopCurrencyPipe } from '../../shared/pipes/cop-currency.pipe';
import { ContractResults } from '../../shared/results/contract-results';
import { BadgeVigente, SourceBadge, StatusBadge } from '../../shared/ui/badges';
import { BackLink, SecopLink } from '../../shared/ui/detail-parts';
import { IndustryChips, LocationCell } from '../../shared/ui/record-cells';
import { ErrorState, Skeleton } from '../../shared/ui/states';
import { EnrichmentSection } from './enrichment-section';

/** `/licitaciones/:source/:sourceId`: todos los campos, contratos relacionados y documentos. */
@Component({
  selector: 'app-process-detail-page',
  imports: [
    DatePipe,
    CopCurrencyPipe,
    BackLink,
    SecopLink,
    StatusBadge,
    SourceBadge,
    BadgeVigente,
    IndustryChips,
    LocationCell,
    ContractResults,
    ErrorState,
    Skeleton,
    EnrichmentSection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-back-link link="/licitaciones" label="Volver a licitaciones" />

    @if (detail.error(); as error) {
      <app-error-state
        [error]="error"
        heading="No pudimos abrir este proceso"
        [retryable]="!notFound()"
        (retry)="detail.reload()"
      />
    } @else if (process(); as p) {
      <article class="space-y-6">
        <header class="card p-5 sm:p-6">
          <div class="flex flex-wrap items-center gap-2">
            <app-status-badge [status]="p.status" />
            <app-source-badge [source]="p.source" />
            @if (!p.isCompetitive) {
              <span class="badge-neutral">Contratación directa</span>
            }
            <app-badge-vigente [active]="p.isActive" [deadline]="p.offersDeadlineAt" />
          </div>
          <h1 class="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {{ p.title }}
          </h1>
          <p class="mt-2 text-muted">
            {{ p.entityName }}
            @if (p.entityNit) {
              <span class="whitespace-nowrap">· NIT {{ p.entityNit }}</span>
            }
          </p>
          <div class="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <dl class="grid grid-cols-2 gap-x-8 gap-y-3 sm:flex">
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Precio base</dt>
                <dd class="text-xl font-semibold tabular">{{ p.basePrice | copCurrency }}</dd>
              </div>
              @if (p.awarded) {
                <div>
                  <dt class="text-xs font-medium text-muted uppercase">Valor adjudicado</dt>
                  <dd class="text-xl font-semibold tabular">{{ p.awardedValue | copCurrency }}</dd>
                </div>
              }
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Cierre de ofertas</dt>
                <dd class="text-xl font-semibold tabular">
                  {{ p.offersDeadlineAt ? (p.offersDeadlineAt | date: 'dd/MM/yyyy HH:mm') : '—' }}
                </dd>
              </div>
            </dl>
            <app-secop-link [url]="p.url" />
          </div>
        </header>

        <div class="grid gap-6 lg:grid-cols-3">
          <section class="card p-5 lg:col-span-2" aria-labelledby="ficha-title">
            <h2 id="ficha-title" class="section-title">Ficha del proceso</h2>
            @if (p.description) {
              <p class="mt-3 leading-relaxed">{{ p.description }}</p>
            }
            <dl class="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Referencia</dt>
                <dd class="mt-1 text-sm">{{ p.reference ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-muted uppercase">
                  Id en {{ p.source === 'secop2' ? 'SECOP II' : 'SECOP I' }}
                </dt>
                <dd class="mt-1 font-mono text-sm break-all">{{ p.sourceId }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Modalidad</dt>
                <dd class="mt-1 text-sm">{{ p.modality ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Tipo de contrato</dt>
                <dd class="mt-1 text-sm">{{ p.contractType ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Fase en SECOP</dt>
                <dd class="mt-1 text-sm">{{ p.phaseRaw ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Publicado</dt>
                <dd class="mt-1 text-sm tabular">
                  {{ p.publishedAt ? (p.publishedAt | date) : '—' }}
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Ubicación</dt>
                <dd class="mt-1 text-sm">
                  <app-location-cell [location]="p.location" [showRaw]="true" />
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Industrias</dt>
                <dd class="mt-1 text-sm">
                  <app-industry-chips [industries]="p.industries" [max]="6" />
                </dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-xs font-medium text-muted uppercase">Códigos UNSPSC</dt>
                <dd class="mt-1 flex flex-wrap gap-1 font-mono text-xs">
                  @for (code of p.unspscCodes; track code) {
                    <span
                      class="chip"
                      [class.border-accent]="code === p.mainUnspsc"
                      [title]="code === p.mainUnspsc ? 'Código principal' : ''"
                      >{{ code }}</span
                    >
                  } @empty {
                    —
                  }
                </dd>
              </div>
            </dl>
          </section>

          <aside class="card h-fit p-5 text-sm" aria-labelledby="registro-title">
            <h2 id="registro-title" class="section-title">Registro</h2>
            <dl class="mt-3 space-y-3">
              <div>
                <dt class="text-muted">Visto por primera vez</dt>
                <dd class="tabular">{{ p.firstSeenAt | date: 'dd/MM/yyyy HH:mm' }}</dd>
              </div>
              <div>
                <dt class="text-muted">Última actualización</dt>
                <dd class="tabular">{{ p.updatedAt | date: 'dd/MM/yyyy HH:mm' }}</dd>
              </div>
              <div>
                <dt class="text-muted">Competitivo</dt>
                <dd>{{ p.isCompetitive ? 'Sí' : 'No (contratación directa)' }}</dd>
              </div>
              <div>
                <dt class="text-muted">Adjudicado</dt>
                <dd>{{ p.awarded ? 'Sí' : 'No' }}</dd>
              </div>
            </dl>
          </aside>
        </div>

        @if (p.source === 'secop2') {
          <app-enrichment-section [sourceId]="p.sourceId" [initial]="p.enrichment" />
        }

        <section aria-labelledby="contratos-title" class="space-y-3">
          <h2 id="contratos-title" class="section-title">Contratos relacionados</h2>
          @if (p.contracts.length > 0) {
            <app-contract-results [items]="p.contracts" caption="Contratos relacionados" />
          } @else {
            <p class="card p-5 text-sm text-muted">Este proceso aún no tiene contratos firmados.</p>
          }
        </section>
      </article>
    } @else {
      <app-skeleton variant="block" [height]="220" />
      <div class="mt-6"><app-skeleton [rows]="4" /></div>
    }
  `,
})
export class ProcessDetailPage {
  readonly source = input.required<string>();
  readonly sourceId = input.required<string>();

  protected readonly detail = inject(ProcessesService).detail(() => ({
    source: this.source(),
    sourceId: this.sourceId(),
  }));
  protected readonly process = computed(() =>
    this.detail.hasValue() ? this.detail.value() : undefined,
  );
  protected readonly notFound = computed(
    () => (this.detail.error() as { status?: number } | undefined)?.status === 404,
  );
}
