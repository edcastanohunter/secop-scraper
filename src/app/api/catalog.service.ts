import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';

import { apiUrl } from '../core/config/api-url';
import {
  CreateLocationAliasRequest,
  Department,
  Industry,
  Municipality,
  PagedList,
  RefreshDivipolaResult,
  UnresolvedLocation,
  UpsertIndustryMappingRequest,
} from './models';

export interface MunicipalityQuery {
  q?: string;
  departmentCode?: string;
}

/**
 * Catálogos DIVIPOLA e industrias (SPEC 01). Las lecturas crean un `httpResource`, así que se
 * llaman en un contexto de inyección (inicializadores de campo de un componente).
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  departments() {
    return httpResource<Department[]>(() => apiUrl('/catalog/departments'), { defaultValue: [] });
  }

  industries() {
    return httpResource<Industry[]>(() => apiUrl('/catalog/industries'), { defaultValue: [] });
  }

  /** `undefined` deja el recurso en espera (p. ej. mientras no haya texto que autocompletar). */
  municipalities(query: () => MunicipalityQuery | undefined) {
    return httpResource<Municipality[]>(
      () => {
        const value = query();
        if (!value) return undefined;
        const params: Record<string, string> = {};
        if (value.q) params['q'] = value.q;
        if (value.departmentCode) params['departmentCode'] = value.departmentCode;
        return { url: apiUrl('/catalog/municipalities'), params };
      },
      { defaultValue: [] },
    );
  }

  /** Municipios de varios departamentos, para poner nombre a los códigos DIVIPOLA de la URL. */
  municipalitiesOf(departmentCodes: readonly string[]): Observable<Municipality[]> {
    if (departmentCodes.length === 0) return of([]);
    return forkJoin(
      departmentCodes.map((departmentCode) =>
        this.http.get<Municipality[]>(apiUrl('/catalog/municipalities'), {
          params: { departmentCode },
        }),
      ),
    ).pipe(map((lists) => lists.flat()));
  }

  unresolvedLocations(query: () => { page: number; pageSize: number }) {
    return httpResource<PagedList<UnresolvedLocation>>(() => {
      const { page, pageSize } = query();
      return { url: apiUrl('/catalog/unresolved-locations'), params: { page, pageSize } };
    });
  }

  /** 404 si el código DIVIPOLA no existe, 409 si el alias ya existe. */
  createLocationAlias(body: CreateLocationAliasRequest): Observable<unknown> {
    return this.http.post(apiUrl('/catalog/location-aliases'), body);
  }

  upsertIndustryMapping(prefix: string, body: UpsertIndustryMappingRequest): Observable<void> {
    return this.http.put<void>(this.mappingUrl(prefix), body);
  }

  deleteIndustryMapping(prefix: string): Observable<void> {
    return this.http.delete<void>(this.mappingUrl(prefix));
  }

  refreshDivipola(): Observable<RefreshDivipolaResult> {
    return this.http.post<RefreshDivipolaResult>(apiUrl('/catalog/divipola/refresh'), null);
  }

  private mappingUrl(prefix: string): string {
    return apiUrl(`/catalog/industry-mappings/${encodeURIComponent(prefix)}`);
  }
}
