import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { apiUrl } from '../core/config/api-url';
import { SearchFilters, toApiParams } from '../shared/utils/filters';
import { ContractDetail, ContractRefreshResult, ContractSummary, SearchPage } from './models';
import { RecordKey, recordPath } from './processes.service';

/** Contratos firmados (SPEC 05). */
@Injectable({ providedIn: 'root' })
export class ContractsService {
  private readonly http = inject(HttpClient);

  list(filters: () => SearchFilters | undefined) {
    return httpResource<SearchPage<ContractSummary>>(() => {
      const value = filters();
      return value && { url: apiUrl('/contracts'), params: toApiParams(value, 'contracts') };
    });
  }

  detail(key: () => RecordKey | undefined) {
    return httpResource<ContractDetail>(() => {
      const value = key();
      return value && apiUrl(recordPath('contracts', value));
    });
  }

  /** Relee un contrato de SECOP II (SPEC 17). Requiere el rol `procurement:refresh`. */
  refresh(key: RecordKey) {
    return this.http.post<ContractRefreshResult>(
      apiUrl(`${recordPath('contracts', key)}/refresh`),
      null,
    );
  }
}
