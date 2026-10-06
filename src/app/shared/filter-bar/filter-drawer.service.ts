import { Injectable, signal } from '@angular/core';

/** Panel lateral de filtros en móvil (< 1024 px): lo abre el buscador y lo cierra el panel. */
@Injectable()
export class FilterDrawer {
  private readonly isOpen = signal(false);
  readonly open = this.isOpen.asReadonly();

  show(): void {
    this.isOpen.set(true);
  }

  hide(): void {
    this.isOpen.set(false);
  }
}
