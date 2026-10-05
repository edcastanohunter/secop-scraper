import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { Toast, ToastService } from './toast.service';

const KIND_CLASSES: Record<Toast['kind'], string> = {
  info: 'border-line',
  success: 'border-success',
  warning: 'border-warning',
  error: 'border-danger',
};

@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:end-6"
      role="status"
      aria-live="polite"
    >
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          class="card pointer-events-auto flex w-full max-w-sm items-start gap-3 border-s-4 p-4 shadow-lg"
          [class]="kindClass(toast)"
        >
          <p class="flex-1 text-sm">
            {{ toast.message }}
            @if (toast.countdownUntil) {
              Podrás reintentar en {{ secondsLeft(toast) }} s.
            }
          </p>
          <button
            type="button"
            class="btn-ghost -m-1 px-1.5 py-1"
            aria-label="Cerrar aviso"
            (click)="toasts.dismiss(toast.id)"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastHost {
  protected readonly toasts = inject(ToastService);
  private readonly now = signal(Date.now());
  private readonly counting = computed(() =>
    this.toasts.toasts().some((toast) => toast.countdownUntil !== undefined),
  );

  /** El reloj solo corre mientras haya una cuenta regresiva visible. */
  private readonly tick = effect((onCleanup) => {
    if (!this.counting()) return;
    this.now.set(Date.now());
    const id = setInterval(() => this.now.set(Date.now()), 1000);
    onCleanup(() => clearInterval(id));
  });

  protected kindClass(toast: Toast): string {
    return KIND_CLASSES[toast.kind];
  }

  protected secondsLeft(toast: Toast): number {
    return Math.max(0, Math.ceil(((toast.countdownUntil ?? 0) - this.now()) / 1000));
  }
}
