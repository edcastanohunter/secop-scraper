import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { Subscription } from 'rxjs';

import { EnrichmentService, isFinalEnrichment } from '../../api/enrichment.service';
import { Enrichment } from '../../api/models';
import { ProblemDetails, problemMessage, toProblem } from '../../core/http/problem-details';
import { ENRICHMENT_STATUS_LABELS } from '../../shared/utils/labels';

/**
 * "Documentos y cronograma" de un proceso SECOP II. "Obtener del portal SECOP" encola el
 * scraping y consulta su estado cada 5 s hasta un estado final (SPEC 07).
 */
@Component({
  selector: 'app-enrichment-section',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card p-5" aria-labelledby="enrichment-title">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="enrichment-title" class="section-title">Documentos y cronograma</h2>
          <p class="mt-1 text-sm text-muted">
            Se consultan en el portal público de SECOP II a pedido; pueden tardar unos segundos.
          </p>
        </div>
        <button type="button" class="btn-primary" [disabled]="busy()" (click)="request()">
          @if (busy()) {
            <span
              class="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            ></span>
            Consultando…
          } @else {
            {{ enrichment() ? 'Actualizar desde el portal' : 'Obtener del portal SECOP' }}
          }
        </button>
      </div>

      <div aria-live="polite">
        @if (problem(); as info) {
          <p
            class="mt-4 rounded-md px-3 py-2 text-sm"
            [class]="
              info.status === 503 ? 'bg-warning-soft text-warning' : 'bg-danger-soft text-danger'
            "
            role="alert"
          >
            {{ problemText() }}
          </p>
        }

        @if (enrichment(); as data) {
          <p class="mt-4 text-sm text-muted">
            Estado: <strong class="text-ink">{{ statusLabels[data.status] }}</strong>
            @if (data.completedAt) {
              · Consultado el {{ data.completedAt | date: 'dd/MM/yyyy HH:mm' }}
            }
          </p>
          @if (data.error) {
            <p class="mt-2 text-sm text-danger">{{ data.error }}</p>
          }
          @if (data.status === 'succeeded') {
            <div class="mt-4 grid gap-6 md:grid-cols-2">
              <div>
                <h3 class="text-sm font-semibold">Documentos</h3>
                <ul class="mt-2 divide-y divide-line">
                  @for (doc of data.documents; track doc.url) {
                    <li class="flex items-center justify-between gap-3 py-2 text-sm">
                      <a
                        class="link truncate"
                        [href]="doc.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        >{{ doc.name }}<span class="sr-only"> (abre en una pestaña nueva)</span></a
                      >
                      @if (doc.publishedAt) {
                        <span class="shrink-0 text-xs text-muted tabular">{{
                          doc.publishedAt | date
                        }}</span>
                      }
                    </li>
                  } @empty {
                    <li class="py-2 text-sm text-muted">
                      El portal no publica documentos para este proceso.
                    </li>
                  }
                </ul>
              </div>
              <div>
                <h3 class="text-sm font-semibold">Cronograma</h3>
                <ol class="mt-2 space-y-2 border-s-2 border-line ps-4">
                  @for (entry of data.schedule; track $index) {
                    <li class="relative text-sm">
                      <span
                        class="absolute -start-[1.4rem] top-1.5 size-2.5 rounded-full bg-accent"
                        aria-hidden="true"
                      ></span>
                      <p>{{ entry.milestone }}</p>
                      <p class="text-xs text-muted tabular">
                        {{ entry.date ? (entry.date | date: 'dd/MM/yyyy HH:mm') : 'Sin fecha' }}
                      </p>
                    </li>
                  } @empty {
                    <li class="text-sm text-muted">Sin cronograma publicado.</li>
                  }
                </ol>
              </div>
            </div>
          }
        } @else if (!problem()) {
          <p class="mt-4 text-sm text-muted">
            Aún no se han consultado los documentos de este proceso.
          </p>
        }
      </div>
    </section>
  `,
})
export class EnrichmentSection {
  private readonly api = inject(EnrichmentService);

  readonly sourceId = input.required<string>();
  readonly initial = input<Enrichment | null | undefined>(null);

  protected readonly statusLabels = ENRICHMENT_STATUS_LABELS;
  protected readonly enrichment = linkedSignal(() => this.initial() ?? null);
  protected readonly problem = signal<ProblemDetails | null>(null);
  private readonly requesting = signal(false);
  private readonly polling = signal(false);
  protected readonly busy = computed(() => this.requesting() || this.polling());
  private subscription: Subscription | undefined;

  protected readonly problemText = computed(() => {
    const info = this.problem();
    if (!info) return '';
    if (info.errorCode === 'Scraping.HostBlocked') {
      const until = info.extensions['blockedUntil'];
      const time = typeof until === 'string' ? hourInBogota(until) : null;
      return time
        ? `El portal SECOP limitó el acceso; inténtalo después de las ${time}.`
        : problemMessage(info);
    }
    if (info.errorCode === 'Scraping.Disabled') return 'Función no disponible por ahora.';
    return problemMessage(info);
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.subscription?.unsubscribe());
    // Si al abrir el detalle ya hay una consulta en curso, se sigue su estado.
    effect(() => {
      const current = this.initial();
      if (current && !isFinalEnrichment(current)) untracked(() => this.poll());
    });
  }

  protected request(): void {
    this.problem.set(null);
    this.requesting.set(true);
    this.api.request(this.sourceId()).subscribe({
      next: (enrichment) => {
        this.requesting.set(false);
        this.enrichment.set(enrichment);
        if (!isFinalEnrichment(enrichment)) this.poll();
      },
      error: (error: unknown) => {
        this.requesting.set(false);
        const problem = toProblem(error);
        this.problem.set(problem);
        // 409: ya hay una consulta corriendo; basta con seguirla.
        if (problem.status === 409) this.poll();
      },
    });
  }

  private poll(): void {
    this.subscription?.unsubscribe();
    this.polling.set(true);
    this.subscription = this.api.poll(this.sourceId()).subscribe({
      next: (enrichment) => {
        this.enrichment.set(enrichment);
        if (isFinalEnrichment(enrichment)) this.problem.set(null);
      },
      error: (error: unknown) => {
        this.polling.set(false);
        this.problem.set(toProblem(error));
      },
      complete: () => this.polling.set(false),
    });
  }
}

/** "16:30" en America/Bogota. */
export function hourInBogota(iso: string): string | null {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Bogota',
  }).format(time);
}
