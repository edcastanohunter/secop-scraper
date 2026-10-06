import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { apiUrl } from '../core/config/api-url';
import { SearchFilters, toApiParams } from '../shared/utils/filters';
import { OpportunityItem, SearchPage } from './models';

/** Búsqueda cruzada de procesos y contratos (`GET /search`). */
@Injectable({ providedIn: 'root' })
export class SearchService {
  search(filters: () => SearchFilters | undefined) {
    return httpResource<SearchPage<OpportunityItem>>(() => {
      const value = filters();
      return value && { url: apiUrl('/search'), params: toApiParams(value, 'search') };
    });
  }
}
