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
