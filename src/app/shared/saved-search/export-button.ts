import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ExportService } from '../../api/export.service';
import { SearchKind } from '../../api/models';
import { exportRowCount, problemMessage, toProblem } from '../../core/http/problem-details';
import { ToastService } from '../../core/notifications/toast.service';
import { saveBlob } from '../utils/download';
import { SearchFilters } from '../utils/filters';
import { formatCount } from '../utils/format';

/** Máximo de filas por exportación en la API. */
const EXPORT_MAX_ROWS = 50_000;

/**
 * Descarga el CSV de los filtros actuales. Se usa dentro de `*appHasRole="'procurement:export'"`.
 * El 429 lo avisa el interceptor global; aquí se tratan 422 `Export.TooManyRows` y el resto.
 */
@Component({
  selector: 'app-export-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="btn-secondary" [disabled]="busy()" (click)="download()">
      <svg
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      {{ busy() ? 'Exportando…' : 'Exportar CSV' }}
    </button>
  `,
})
export class ExportButton {
  private readonly exporter = inject(ExportService);
  private readonly toasts = inject(ToastService);

  readonly kind = input.required<SearchKind>();
  readonly filters = input.required<SearchFilters>();
  protected readonly busy = signal(false);

  protected async download(): Promise<void> {
    this.busy.set(true);
    try {
      const file = await firstValueFrom(this.exporter.csv(this.kind(), this.filters()));
      saveBlob(file.blob, file.filename);
      this.toasts.show('success', `Descargando ${file.filename}`);
    } catch (error) {
      await this.report(error);
    } finally {
      this.busy.set(false);
    }
  }

  private async report(error: unknown): Promise<void> {
    if (!(error instanceof HttpErrorResponse)) throw error;
    if (error.status === 429 || error.status === 401 || error.status === 403) return;
    // Con `responseType: 'blob'` el ProblemDetails llega como Blob.
    const body = error.error instanceof Blob ? await error.error.text() : error.error;
    const problem = toProblem(body, error.status);
    if (problem.errorCode === 'Export.TooManyRows') {
      const rows = exportRowCount(problem);
      const count = rows === null ? 'Demasiados' : `${formatCount(rows)}`;
      this.toasts.show(
        'error',
        `${count} resultados superan el máximo de ${formatCount(EXPORT_MAX_ROWS)} filas por exportación. Afina los filtros (fechas, municipio o industria) e inténtalo de nuevo.`,
        10_000,
      );
      return;
    }
    this.toasts.show('error', problemMessage(problem));
  }
}
