import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  /** Si existe, el toast muestra una cuenta regresiva hasta este instante (epoch ms). */
  countdownUntil?: number;
}

const DEFAULT_DURATION_MS = 6000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly items = signal<readonly Toast[]>([]);

  readonly toasts = this.items.asReadonly();

  show(kind: ToastKind, message: string, durationMs = DEFAULT_DURATION_MS): number {
    return this.push({ kind, message }, durationMs);
  }

  /** 429: avisa cuándo se puede reintentar y se cierra solo al terminar la cuenta. */
  rateLimited(retryAfterSeconds: number | null): number {
    if (retryAfterSeconds === null || retryAfterSeconds <= 0) {
      return this.show('warning', 'Hiciste demasiadas solicitudes seguidas. Espera un momento.');
    }
    const ms = retryAfterSeconds * 1000;
    return this.push(
      {
        kind: 'warning',
        message: 'Hiciste demasiadas solicitudes seguidas.',
        countdownUntil: Date.now() + ms,
      },
      ms,
    );
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((toast) => toast.id !== id));
  }

  private push(toast: Omit<Toast, 'id'>, durationMs: number): number {
    const id = this.nextId++;
    this.items.update((list) => [...list, { ...toast, id }]);
    setTimeout(() => this.dismiss(id), durationMs);
    return id;
  }
}
