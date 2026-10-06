import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { apiUrl } from '../core/config/api-url';
import { SearchFilters, toApiParams } from '../shared/utils/filters';
import { ContractDetail, ContractSummary, SearchPage } from './models';
import { RecordKey, recordPath } from './processes.service';

/** Contratos firmados (SPEC 05). */
@Injectable({ providedIn: 'root' })
export class ContractsService {
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
}
