import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiUrl } from '../core/config/api-url';
import { filenameFromContentDisposition } from '../shared/utils/download';
import { SearchFilters, toApiParams } from '../shared/utils/filters';
import { SearchKind } from './models';

export interface CsvFile {
  blob: Blob;
  /** Nombre de `Content-Disposition`, o uno por defecto si no viene. */
  filename: string;
}

/**
 * Exporta a CSV (UTF-8 con BOM, `;`) los registros que cumplen los filtros (rol
 * `procurement:export`). 422 `Export.TooManyRows` por encima de 50.000 filas.
 */
@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly http = inject(HttpClient);

  csv(kind: SearchKind, filters: SearchFilters): Observable<CsvFile> {
    const scope = kind === 'processes' ? 'export-processes' : 'export-contracts';
    return this.http
      .get(apiUrl(`/${kind}/export`), {
        params: toApiParams(filters, scope),
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((response) => ({
          blob: response.body ?? new Blob([], { type: 'text/csv' }),
          filename: filenameFromContentDisposition(
            response.headers.get('Content-Disposition'),
            `${kind === 'processes' ? 'licitaciones' : 'contratos'}.csv`,
          ),
        })),
      );
  }
}
