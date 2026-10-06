import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Indicador del panel: etiqueta, cifra grande y una nota opcional. */
@Component({
  selector: 'app-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="card relative h-full overflow-hidden p-4 sm:p-5">
      <span
        class="absolute inset-y-0 start-0 w-1"
        [class]="accent() ? 'bg-accent' : 'bg-line'"
        aria-hidden="true"
      ></span>
      <p class="text-sm font-medium text-muted">{{ label() }}</p>
      <p class="mt-1 text-2xl font-semibold tracking-tight tabular sm:text-3xl">{{ value() }}</p>
      @if (note()) {
        <p class="mt-1 text-xs text-muted">{{ note() }}</p>
      }
    </div>
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly note = input<string>();
  readonly accent = input(false);
}
