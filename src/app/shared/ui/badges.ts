import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { Clock } from '../utils/clock';
import { deadlineUrgent, relativeDeadline } from '../utils/format';
import { badgeClass, sourceLabel, statusLabel, statusTone } from '../utils/labels';

/**
 * Badge "Vigente" con la cuenta regresiva hasta el cierre ("Cierra en 3 días"). Solo aparece
 * si el backend marcó el proceso como vigente (`isActive`): la UI no lo recalcula.
 */
@Component({
  selector: 'app-badge-vigente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (active()) {
      <span class="inline-flex flex-wrap items-center gap-1.5">
        <span class="badge-success">
          <span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>
          Vigente
        </span>
        @if (countdown(); as text) {
          <span class="text-xs font-medium" [class]="urgent() ? 'text-danger' : 'text-muted'">{{
            text
          }}</span>
        }
      </span>
    }
  `,
})
export class BadgeVigente {
  private readonly clock = inject(Clock);
  readonly active = input.required<boolean>();
  readonly deadline = input<string | null>(null);

  protected readonly countdown = computed(() =>
    relativeDeadline(this.deadline(), this.clock.now()),
  );
  protected readonly urgent = computed(() => deadlineUrgent(this.deadline(), this.clock.now()));
}

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="tone()">{{ label() }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<string>();
  protected readonly label = computed(() => statusLabel(this.status()));
  protected readonly tone = computed(() => badgeClass(statusTone(this.status())));
}

@Component({
  selector: 'app-source-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge-neutral font-mono">{{ label() }}</span>`,
})
export class SourceBadge {
  readonly source = input.required<string>();
  protected readonly label = computed(() => sourceLabel(this.source()));
}

const VALUE_FLAG_LABEL = 'Valor sospechoso';
const VALUE_FLAG_TIP =
  'Este valor es inusualmente alto y probablemente es un error en la fuente de datos (SECOP). No lo use en análisis sin verificarlo.';

/**
 * Advertencia (ámbar, no error) para montos que el backend marcó con `valueFlag`. Solo depende
 * de ese campo: la UI no recalcula el umbral. `compact` muestra solo el ícono (listas, móvil).
 */
@Component({
  selector: 'app-value-flag-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (flag()) {
      @if (compact()) {
        <span
          role="img"
          class="ms-1 inline-flex align-middle text-warning"
          [attr.aria-label]="label"
          [title]="tip"
        >
          <svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            />
          </svg>
        </span>
      } @else {
        <span class="badge-warning" [title]="tip">
          <svg class="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            />
          </svg>
          {{ label }}
        </span>
      }
    }
  `,
})
export class ValueFlagBadge {
  readonly flag = input<string | null | undefined>(null);
  readonly compact = input(false);
  protected readonly label = VALUE_FLAG_LABEL;
  protected readonly tip = VALUE_FLAG_TIP;
}
