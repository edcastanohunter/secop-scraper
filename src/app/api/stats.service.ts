import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { apiUrl } from '../core/config/api-url';
import { ApiParams, SearchFilters, toApiParams } from '../shared/utils/filters';
import {
  EntityBucket,
  Facets,
  IndustryBucket,
  LocationBucket,
  LocationLevel,
  SearchKind,
  StatsInterval,
  StatsList,
  StatsSummary,
  TimeSeriesPoint,
} from './models';

export interface StatsQuery {
  filters: SearchFilters;
  kind: SearchKind;
}

/** Estadísticas del panel (SPEC 06). Cada recurso queda en espera si `query()` es `undefined`. */
@Injectable({ providedIn: 'root' })
export class StatsService {
  summary(query: () => StatsQuery | undefined) {
    return this.resource<StatsSummary, StatsQuery>('/stats/summary', query);
  }

  /** `dateFrom` y `dateTo` son obligatorias (3 años como máximo). */
  timeSeries(query: () => (StatsQuery & { interval: StatsInterval }) | undefined) {
    return this.resource<StatsList<TimeSeriesPoint>, StatsQuery & { interval: StatsInterval }>(
      '/stats/timeseries',
      query,
      (q) => ({ interval: q.interval }),
    );
  }

  byIndustry(query: () => StatsQuery | undefined) {
    return this.resource<StatsList<IndustryBucket>, StatsQuery>('/stats/by-industry', query);
  }

  /** `municipality` exige filtrar por un departamento. */
  byLocation(query: () => (StatsQuery & { level: LocationLevel }) | undefined) {
    return this.resource<StatsList<LocationBucket>, StatsQuery & { level: LocationLevel }>(
      '/stats/by-location',
      query,
      (q) => ({ level: q.level }),
    );
  }

  topEntities(query: () => (StatsQuery & { limit: number }) | undefined) {
    return this.resource<StatsList<EntityBucket>, StatsQuery & { limit: number }>(
      '/stats/top-entities',
      query,
      (q) => ({ limit: String(q.limit) }),
    );
  }

  /** Cada facet ignora su propio filtro: los conteos alimentan la barra de filtros. */
  facets(query: () => StatsQuery | undefined) {
    return this.resource<Facets, StatsQuery>('/stats/facets', query);
  }

  private resource<T, Q extends StatsQuery>(
    path: string,
    query: () => Q | undefined,
    extra: (q: Q) => ApiParams = () => ({}),
  ) {
    return httpResource<T>(() => {
      const value = query();
      if (!value) return undefined;
      return {
        url: apiUrl(path),
        params: { ...toApiParams(value.filters, 'stats', value.kind), ...extra(value) },
      };
    });
  }
}
