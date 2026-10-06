import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { apiUrl } from '../core/config/api-url';
import {
  AlertDelivery,
  CreateSavedSearchRequest,
  PagedList,
  SavedSearch,
  SavedSearchResults,
  SortOrder,
  UpdateSavedSearchRequest,
} from './models';

export interface ResultsQuery {
  id: string;
  page: number;
  pageSize: number;
  sort: SortOrder | null;
}

export interface DeliveriesQuery {
  id: string;
  page: number;
  pageSize: number;
}

/** Búsquedas guardadas y alertas del usuario actual (SPEC 08). */
@Injectable({ providedIn: 'root' })
export class SavedSearchesService {
  private readonly http = inject(HttpClient);

  list() {
    return httpResource<SavedSearch[]>(() => apiUrl('/saved-searches'), { defaultValue: [] });
  }

  get(id: () => string | undefined) {
    return httpResource<SavedSearch>(() => {
      const value = id();
      return value && this.url(value);
    });
  }

  /** La página es de procesos o de contratos según el `kind` de la búsqueda. */
  results(query: () => ResultsQuery | undefined) {
    return httpResource<SavedSearchResults>(() => {
      const value = query();
      if (!value) return undefined;
      const params: Record<string, string | number> = {
        page: value.page,
        pageSize: value.pageSize,
      };
      if (value.sort) params['sort'] = value.sort;
      return { url: `${this.url(value.id)}/results`, params };
    });
  }

  deliveries(query: () => DeliveriesQuery | undefined) {
    return httpResource<PagedList<AlertDelivery>>(() => {
      const value = query();
      return (
        value && {
          url: `${this.url(value.id)}/deliveries`,
          params: { page: value.page, pageSize: value.pageSize },
        }
      );
    });
  }

  /** 422 `SavedSearch.LimitReached` / `VerifiedEmailRequired`, 409 `SavedSearch.NameTaken`. */
  create(body: CreateSavedSearchRequest): Observable<SavedSearch> {
    return this.http.post<SavedSearch>(apiUrl('/saved-searches'), body);
  }

  update(id: string, body: UpdateSavedSearchRequest): Observable<SavedSearch> {
    return this.http.put<SavedSearch>(this.url(id), body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.url(id));
  }

  pause(id: string): Observable<void> {
    return this.http.post<void>(`${this.url(id)}/pause`, null);
  }

  resume(id: string): Observable<void> {
    return this.http.post<void>(`${this.url(id)}/resume`, null);
  }

  private url(id: string): string {
    return apiUrl(`/saved-searches/${encodeURIComponent(id)}`);
  }
}
