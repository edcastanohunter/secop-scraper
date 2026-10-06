import { computed, inject, ResourceRef, Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { CatalogService } from '../../api/catalog.service';
import { Municipality, SavedSearch } from '../../api/models';
import { FilterNames, summarizeFilters } from '../../shared/filter-bar/describe-filters';
import { fromSavedSearchFilter } from '../../shared/utils/filters';

/**
 * Nombres de industrias, departamentos y municipios para resumir búsquedas guardadas
 * ("Software · Cajicá, Chía · Solo vigentes"). Se crea en un contexto de inyección
 * (inicializador de campo de la página) con la lista de búsquedas a resumir.
 */
export class SavedSearchNames {
  private readonly catalog = inject(CatalogService);
  private readonly industries = this.catalog.industries();
  private readonly departments = this.catalog.departments();
  private readonly searches: Signal<readonly SavedSearch[]>;
  private readonly municipalities: ResourceRef<Municipality[]>;

  constructor(searches: Signal<readonly SavedSearch[]>) {
    this.searches = searches;
    const departmentCodes = computed(
      () =>
        [
          ...new Set(
            this.searches().flatMap((s) =>
              (s.filters.municipality ?? []).map((c) => c.slice(0, 2)),
            ),
          ),
        ].sort(),
      { equal: (a, b) => a.join() === b.join() },
    );
    this.municipalities = rxResource({
      params: () => departmentCodes(),
      stream: ({ params }) => this.catalog.municipalitiesOf(params),
      defaultValue: [],
    });
  }

  readonly names: FilterNames = {
    industry: (id) => this.industries.value().find((i) => i.id === id)?.name ?? id,
    department: (code) => this.departments.value().find((d) => d.code === code)?.name ?? code,
    municipality: (code) =>
      this.municipalities.value().find((m) => m.divipolaCode === code)?.name ?? code,
  };

  summary(search: SavedSearch): string {
    return summarizeFilters(fromSavedSearchFilter(search.filters), this.names);
  }
}
