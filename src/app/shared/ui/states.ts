import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { problemMessage, toProblem } from '../../core/http/problem-details';
import { ToastService } from '../../core/notifications/toast.service';

/** Bloques grises con la forma del contenido mientras carga (no spinners a pantalla completa). */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    @switch (variant()) {
      @case ('cards') {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (row of rowsArray(); track $index) {
            <div class="card space-y-3 p-4">
              <div class="skeleton h-3 w-1/2"></div>
              <div class="skeleton h-7 w-3/4"></div>
            </div>
          }
        </div>
      }
      @case ('block') {
        <div class="skeleton w-full" [style.height.px]="height()"></div>
      }
      @default {
        <div class="card divide-y divide-line">
          @for (row of rowsArray(); track $index) {
            <div class="flex items-start gap-4 p-4">
              <div class="flex-1 space-y-2">
                <div class="skeleton h-4" [style.width.%]="70 - ($index % 3) * 12"></div>
                <div class="skeleton h-3 w-1/3"></div>
              </div>
              <div class="skeleton hidden h-4 w-24 sm:block"></div>
            </div>
          }
        </div>
      }
    }
  `,
})
export class Skeleton {
  readonly rows = input(5);
  readonly variant = input<'rows' | 'cards' | 'block'>('rows');
  readonly height = input(240);
  protected readonly rowsArray = computed(() => Array.from({ length: this.rows() }));
}

/** Estado vacío con una ilustración ligera y sugerencias para ampliar la búsqueda. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card flex flex-col items-center px-6 py-12 text-center">
      <svg class="size-20 text-accent" viewBox="0 0 80 80" fill="none" aria-hidden="true">
        <circle cx="40" cy="40" r="34" stroke="currentColor" stroke-width="2" opacity="0.2" />
        <circle cx="40" cy="40" r="22" stroke="currentColor" stroke-width="2" opacity="0.35" />
        <circle cx="40" cy="40" r="10" stroke="currentColor" stroke-width="2" opacity="0.55" />
        <path d="M40 40 L64 22" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="58" cy="54" r="3" fill="currentColor" opacity="0.4" />
      </svg>
      <h2 class="mt-4 text-lg font-semibold">{{ heading() }}</h2>
      @if (message()) {
        <p class="mt-1 max-w-md text-muted">{{ message() }}</p>
      }
      @if (suggestions().length > 0) {
        <ul class="mt-4 flex flex-wrap justify-center gap-2">
          @for (suggestion of suggestions(); track suggestion.label) {
            <li>
              <button type="button" class="btn-secondary" (click)="suggestion.apply()">
                {{ suggestion.label }}
              </button>
            </li>
          }
        </ul>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyState {
  readonly heading = input('No hay resultados');
  readonly message = input<string>();
  readonly suggestions = input<readonly { label: string; apply: () => void }[]>([]);
}

/**
 * Error humano a partir de un ProblemDetails, con "Reintentar" y el `traceId` copiable para
 * reportarlo.
 */
@Component({
  selector: 'app-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let info = problem();
    <div class="card border-danger/40 bg-danger-soft/40 p-5" role="alert">
      <div class="flex items-start gap-3">
        <svg
          class="mt-0.5 size-5 shrink-0 text-danger"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6M12 16.5v.5" stroke-linecap="round" />
        </svg>
        <div class="min-w-0 flex-1">
          <p class="font-semibold">{{ heading() }}</p>
          <p class="mt-1 text-sm">{{ message() }}</p>
          @if (info.issues.length > 0) {
            <ul class="mt-2 list-disc ps-5 text-sm">
              @for (issue of info.issues; track $index) {
                <li>{{ issue.description }}</li>
              }
            </ul>
          }
          <div class="mt-4 flex flex-wrap items-center gap-3">
            @if (retryable()) {
              <button type="button" class="btn-secondary" (click)="retry.emit()">Reintentar</button>
            }
            @if (info.traceId) {
              <span class="text-xs text-muted">
                Código de seguimiento:
                <code class="font-mono">{{ info.traceId }}</code>
                <button type="button" class="link ms-1" (click)="copy(info.traceId)">
                  {{ copied() ? 'Copiado' : 'Copiar' }}
                </button>
              </span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ErrorState {
  private readonly toasts = inject(ToastService);

  readonly error = input.required<unknown>();
  readonly heading = input('No pudimos cargar la información');
  readonly retryable = input(true);
  readonly retry = output();

  protected readonly problem = computed(() => toProblem(this.error()));
  protected readonly message = computed(() => problemMessage(this.problem()));
  protected readonly copied = signal(false);

  protected async copy(traceId: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(traceId);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.toasts.show('info', `Código de seguimiento: ${traceId}`);
    }
  }
}
