import { DestroyRef, inject, Injectable, signal } from '@angular/core';

/** Reloj compartido que avanza cada minuto: basta para las cuentas regresivas de cierre. */
@Injectable({ providedIn: 'root' })
export class Clock {
  private readonly current = signal(Date.now());
  readonly now = this.current.asReadonly();

  constructor() {
    const timer = setInterval(() => this.current.set(Date.now()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
