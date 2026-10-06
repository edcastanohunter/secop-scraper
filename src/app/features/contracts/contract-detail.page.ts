import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ContractsService } from '../../api/contracts.service';
import { CopCurrencyPipe } from '../../shared/pipes/cop-currency.pipe';
import { SourceBadge, StatusBadge } from '../../shared/ui/badges';
import { BackLink, SecopLink } from '../../shared/ui/detail-parts';
import { IndustryChips, LocationCell } from '../../shared/ui/record-cells';
import { ErrorState, Skeleton } from '../../shared/ui/states';

/** `/contratos/:source/:sourceId`: todos los campos del contrato y su proceso de origen. */
@Component({
  selector: 'app-contract-detail-page',
  imports: [
    DatePipe,
    RouterLink,
    CopCurrencyPipe,
    BackLink,
    SecopLink,
    StatusBadge,
    SourceBadge,
    IndustryChips,
    LocationCell,
    ErrorState,
    Skeleton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-back-link link="/contratos" label="Volver a contratos" />

    @if (detail.error(); as error) {
      <app-error-state
        [error]="error"
        heading="No pudimos abrir este contrato"
        [retryable]="!notFound()"
        (retry)="detail.reload()"
      />
    } @else if (contract(); as c) {
      <article class="space-y-6">
        <header class="card p-5 sm:p-6">
          <div class="flex flex-wrap items-center gap-2">
            <app-status-badge [status]="c.status" />
            <app-source-badge [source]="c.source" />
            @if (c.statusRaw) {
              <span class="text-xs text-muted">SECOP: «{{ c.statusRaw }}»</span>
            }
          </div>
          <h1 class="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {{ c.description }}
          </h1>
          <p class="mt-2 text-muted">
            {{ c.entityName }}
            @if (c.entityNit) {
              <span class="whitespace-nowrap">· NIT {{ c.entityNit }}</span>
            }
          </p>
          <div class="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <dl class="grid grid-cols-2 gap-x-8 gap-y-3 sm:flex">
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Valor</dt>
                <dd class="text-xl font-semibold tabular">{{ c.value | copCurrency }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Pagado</dt>
                <dd class="text-xl font-semibold tabular">{{ c.paidValue | copCurrency }}</dd>
              </div>
              @if (paidShare() !== null) {
                <div class="col-span-2 sm:w-40">
                  <dt class="text-xs font-medium text-muted uppercase">Ejecución</dt>
                  <dd class="mt-2">
                    <div
                      class="h-2 rounded-full bg-sunken"
                      role="progressbar"
                      aria-label="Ejecución del pago"
                      [attr.aria-valuenow]="paidShare()"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    >
                      <div class="h-2 rounded-full bg-accent" [style.width.%]="paidShare()"></div>
                    </div>
                    <span class="text-xs text-muted tabular">{{ paidShare() }} % pagado</span>
                  </dd>
                </div>
              }
            </dl>
            <app-secop-link [url]="c.url" />
          </div>
        </header>

        <div class="grid gap-6 lg:grid-cols-3">
          <section class="card p-5 lg:col-span-2" aria-labelledby="ficha-title">
            <h2 id="ficha-title" class="section-title">Ficha del contrato</h2>
            @if (c.processDescription) {
              <p class="mt-3 leading-relaxed">{{ c.processDescription }}</p>
            }
            <dl class="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Contratista</dt>
                <dd class="mt-1 text-sm">
                  {{ c.supplierName ?? '—' }}
                  @if (c.supplierIsSme) {
                    <span class="badge-info ms-1">Mipyme</span>
                  }
                  @if (c.supplierNit) {
                    <span class="block text-xs text-muted">NIT {{ c.supplierNit }}</span>
                  }
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Referencia</dt>
                <dd class="mt-1 text-sm">{{ c.reference ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Modalidad</dt>
                <dd class="mt-1 text-sm">{{ c.modality ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Tipo de contrato</dt>
                <dd class="mt-1 text-sm">{{ c.contractType ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Firmado</dt>
                <dd class="mt-1 text-sm tabular">{{ c.signedAt ? (c.signedAt | date) : '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Vigencia</dt>
                <dd class="mt-1 text-sm tabular">
                  {{ c.startsAt ? (c.startsAt | date) : '—' }} –
                  {{ c.endsAt ? (c.endsAt | date) : '—' }}
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Ubicación</dt>
                <dd class="mt-1 text-sm">
                  <app-location-cell [location]="c.location" [showRaw]="true" />
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-muted uppercase">Industrias</dt>
                <dd class="mt-1 text-sm">
                  <app-industry-chips [industries]="c.industries" [max]="6" />
                </dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-xs font-medium text-muted uppercase">Códigos UNSPSC</dt>
                <dd class="mt-1 flex flex-wrap gap-1 font-mono text-xs">
                  @for (code of c.unspscCodes; track code) {
                    <span class="chip">{{ code }}</span>
                  } @empty {
                    —
                  }
                </dd>
              </div>
            </dl>
          </section>

          <aside class="card h-fit space-y-4 p-5 text-sm" aria-labelledby="registro-title">
            <h2 id="registro-title" class="section-title">Registro</h2>
            @if (c.processSourceId) {
              <p>
                Proceso de origen:
                <a
                  class="link font-mono break-all"
                  [routerLink]="['/licitaciones', c.source, c.processSourceId]"
                  >{{ c.processSourceId }}</a
                >
              </p>
            }
            <dl class="space-y-3">
              <div>
                <dt class="text-muted">
                  Id en {{ c.source === 'secop2' ? 'SECOP II' : 'SECOP I' }}
                </dt>
                <dd class="font-mono break-all">{{ c.sourceId }}</dd>
              </div>
              <div>
                <dt class="text-muted">Visto por primera vez</dt>
                <dd class="tabular">{{ c.firstSeenAt | date: 'dd/MM/yyyy HH:mm' }}</dd>
              </div>
              <div>
                <dt class="text-muted">Última actualización</dt>
                <dd class="tabular">{{ c.updatedAt | date: 'dd/MM/yyyy HH:mm' }}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </article>
    } @else {
      <app-skeleton variant="block" [height]="220" />
      <div class="mt-6"><app-skeleton [rows]="4" /></div>
    }
  `,
})
export class ContractDetailPage {
  readonly source = input.required<string>();
  readonly sourceId = input.required<string>();

  protected readonly detail = inject(ContractsService).detail(() => ({
    source: this.source(),
    sourceId: this.sourceId(),
  }));
  protected readonly contract = computed(() =>
    this.detail.hasValue() ? this.detail.value() : undefined,
  );
  protected readonly notFound = computed(
    () => (this.detail.error() as { status?: number } | undefined)?.status === 404,
  );
  /** Porcentaje pagado tal como lo reporta SECOP (`paidValue / value`), solo para mostrarlo. */
  protected readonly paidShare = computed(() => {
    const c = this.contract();
    if (!c?.value || c.paidValue === null) return null;
    return Math.min(100, Math.round((c.paidValue / c.value) * 100));
  });
}
