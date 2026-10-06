import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import {
  countActiveFilters,
  FilterDefaults,
  filtersToQueryParams,
  parseFilters,
  SearchFilters,
  withDefaults,
} from './filters';

/** Clave de `data` en la ruta con los valores por defecto de la pantalla. */
export const FILTER_DEFAULTS_KEY = 'filterDefaults';

/**
 * Estado de los filtros de una pantalla, leído y escrito en la URL. Se provee en el componente
 * de la página (`providers: [FilterStateService]`), así cada ruta usa sus propios valores por
 * defecto (p. ej. `/licitaciones` arranca con `onlyActive=true`).
 */
@Injectable()
export class FilterStateService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly defaults: FilterDefaults =
    (this.route.snapshot.data[FILTER_DEFAULTS_KEY] as FilterDefaults | undefined) ?? {};

  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  readonly filters = computed(() => parseFilters(this.params(), this.defaults));
  readonly activeCount = computed(() => countActiveFilters(this.filters(), this.defaults));

  /** Aplica cambios. Cualquier cambio que no sea de página vuelve a la página 1. */
  update(patch: Partial<SearchFilters>): Promise<boolean> {
    const resetPage = !('page' in patch);
    const next: SearchFilters = { ...this.filters(), ...patch, ...(resetPage ? { page: 1 } : {}) };
    return this.navigate(next);
  }

  /** Quita todos los filtros y conserva el tamaño de página y el orden. */
  reset(): Promise<boolean> {
    const { pageSize, sort } = this.filters();
    return this.navigate({ ...withDefaults(this.defaults), pageSize, sort });
  }

  private navigate(filters: SearchFilters): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filtersToQueryParams(filters, this.defaults),
      queryParamsHandling: 'merge',
    });
  }
}
