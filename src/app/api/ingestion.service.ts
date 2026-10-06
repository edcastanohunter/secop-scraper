import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { apiUrl } from '../core/config/api-url';
import {
  DatasetKey,
  IngestionRun,
  IngestionRunStatus,
  PagedList,
  QueueIngestionRunRequest,
  QueueIngestionRunResponse,
  SyncCheckpoint,
} from './models';

export interface RunsQuery {
  datasetKey?: DatasetKey | null;
  status?: IngestionRunStatus | null;
  page: number;
  pageSize: number;
}

/** Runs de sincronización con SECOP y sus checkpoints (SPEC 02/04, rol `ingestion:run`). */
@Injectable({ providedIn: 'root' })
export class IngestionService {
  private readonly http = inject(HttpClient);

  runs(query: () => RunsQuery) {
    return httpResource<PagedList<IngestionRun>>(() => {
      const { datasetKey, status, page, pageSize } = query();
      const params: Record<string, string | number> = { page, pageSize };
      if (datasetKey) params['datasetKey'] = datasetKey;
      if (status) params['status'] = status;
      return { url: apiUrl('/ingestion/runs'), params };
    });
  }

  run(id: () => string | undefined) {
    return httpResource<IngestionRun>(() => {
      const value = id();
      return value && apiUrl(`/ingestion/runs/${encodeURIComponent(value)}`);
    });
  }

  checkpoints() {
    return httpResource<SyncCheckpoint[]>(() => apiUrl('/ingestion/checkpoints'), {
      defaultValue: [],
    });
  }

  /** 202 con el id del run. 409 si ya hay uno activo para ese dataset. */
  queue(body: QueueIngestionRunRequest): Observable<QueueIngestionRunResponse> {
    return this.http.post<QueueIngestionRunResponse>(apiUrl('/ingestion/runs'), body);
  }
}
