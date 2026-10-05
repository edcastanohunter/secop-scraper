import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { summarizeFreshness } from '../utils/freshness';

/** "Datos actualizados al …" con aviso discreto si algún dataset supera las 36 h. */
@Component({
  selector: 'app-freshness-note',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let info = summary();
    <p class="text-sm text-muted">
      @if (info.latest) {
        Datos actualizados al
        <time [attr.datetime]="info.latest.toISOString()">{{
          info.latest | date: 'dd/MM/yyyy HH:mm'
        }}</time>
      } @else {
        Aún no hay datos sincronizados.
      }
      @if (info.stale.length > 0) {
        <span class="ms-1 inline-flex items-center gap-1 text-warning">
          <span aria-hidden="true">●</span>
          Sin actualizar hace más de 36 h: {{ info.stale.join(', ') }}
        </span>
      }
    </p>
  `,
})
export class FreshnessNote {
  readonly lastSyncedAt = input.required<Record<string, string | null>>();

  protected readonly summary = computed(() => summarizeFreshness(this.lastSyncedAt(), Date.now()));
}
