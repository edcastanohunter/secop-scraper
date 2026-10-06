import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { apiUrl } from '../core/config/api-url';
import { SearchFilters, toApiParams } from '../shared/utils/filters';
import { ProcessDetail, ProcessSummary, SearchPage } from './models';

export interface RecordKey {
  source: string;
  sourceId: string;
}

export function recordPath(resource: 'processes' | 'contracts', key: RecordKey): string {
  return `/${resource}/${encodeURIComponent(key.source)}/${encodeURIComponent(key.sourceId)}`;
}

/** Procesos de contratación (SPEC 05). Sin `competitiveOnly=false` se omite la contratación directa. */
@Injectable({ providedIn: 'root' })
export class ProcessesService {
  list(filters: () => SearchFilters | undefined) {
    return httpResource<SearchPage<ProcessSummary>>(() => {
      const value = filters();
      return value && { url: apiUrl('/processes'), params: toApiParams(value, 'processes') };
    });
  }

  detail(key: () => RecordKey | undefined) {
    return httpResource<ProcessDetail>(() => {
      const value = key();
      return value && apiUrl(recordPath('processes', value));
    });
  }
}
