import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Encabezado común de pantalla: título, subtítulo y acciones (contenido proyectado). */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        @if (eyebrow()) {
          <p class="text-xs font-semibold tracking-wider text-accent uppercase">{{ eyebrow() }}</p>
        }
        <h1 class="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {{ heading() }}
        </h1>
        @if (subtitle()) {
          <p class="mt-1 max-w-3xl text-muted">{{ subtitle() }}</p>
        }
        <ng-content select="[slot=meta]" />
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </header>
  `,
})
export class PageHeader {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>();
  readonly eyebrow = input<string>();
}
