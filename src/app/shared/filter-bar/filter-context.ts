import { computed, inject, Injectable, InjectionToken, Provider, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { CatalogService } from '../../api/catalog.service';
import {
  CONTRACT_STATUSES,
  Facets,
  FacetValue,
  PROCESS_STATUSES,
  SearchKind,
} from '../../api/models';
import { StatsService } from '../../api/stats.service';
import { FilterStateService } from '../utils/filter-state.service';
import { FilterDrawer } from './filter-drawer.service';
import { CONTRACT_STATUS_LABELS, PROCESS_STATUS_LABELS, sourceLabel } from '../utils/labels';

/**
 * Qué listado usa la barra de filtros. Decide qué campos se muestran (la API no acepta los
 * mismos filtros en todos los endpoints) y de qué tipo de registro salen los facets.
 */
export type FilterScope = 'processes' | 'contracts' | 'search' | 'stats';

export const FILTER_SCOPE = new InjectionToken<FilterScope>('FILTER_SCOPE');

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

/** Modalidades de contratación tal como las publica SECOP (valores originales). */
export const MODALITIES = [
  'Licitación pública',
  'Selección abreviada de menor cuantía',
  'Selección abreviada subasta inversa',
  'Mínima cuantía',
  'Concurso de méritos',
  'Contratación directa',
  'Régimen especial',
];

/**
 * Datos de apoyo de la barra de filtros: catálogos para las opciones, nombres de los
 * municipios seleccionados (para los chips) y facets con conteos.
 */
@Injectable()
export class FilterLookups {
  private readonly catalog = inject(CatalogService);
  private readonly stats = inject(StatsService);
  private readonly state = inject(FilterStateService);
  readonly scope = inject(FILTER_SCOPE);

  /** En el panel, el tipo de registro lo elige la pantalla (`kind` en la URL). */
  readonly statsKind = signal<SearchKind>('processes');
  readonly kind = computed<SearchKind>(() =>
    this.scope === 'contracts'
      ? 'contracts'
      : this.scope === 'stats'
        ? this.statsKind()
        : 'processes',
  );

  readonly industries = this.catalog.industries();
  readonly departments = this.catalog.departments();

  readonly facets = this.stats.facets(() => ({ filters: this.state.filters(), kind: this.kind() }));

  private readonly selectedDepartments = computed(
    () => [...new Set(this.state.filters().municipality.map((code) => code.slice(0, 2)))].sort(),
    { equal: (a, b) => a.join() === b.join() },
  );
  readonly selectedMunicipalities = rxResource({
    params: () => this.selectedDepartments(),
    stream: ({ params }) => this.catalog.municipalitiesOf(params),
    defaultValue: [],
  });

  private facetCounts(pick: (facets: Facets) => FacetValue[]) {
    return computed(() => {
      const facets = this.facets.hasValue() ? this.facets.value() : undefined;
      return new Map((facets ? pick(facets) : []).map((f) => [f.value, f.count]));
    });
  }

  private readonly industryCounts = this.facetCounts((f) => f.industries);
  private readonly departmentCounts = this.facetCounts((f) => f.departments);
  private readonly statusCounts = this.facetCounts((f) => f.statuses);
  private readonly sourceCounts = this.facetCounts((f) => f.sources);

  readonly industryOptions = computed<FilterOption[]>(() =>
    this.industries.value().map((i) => ({
      value: i.id,
      label: i.name,
      count: this.industryCounts().get(i.id) ?? (this.facets.hasValue() ? 0 : undefined),
    })),
  );

  readonly departmentOptions = computed<FilterOption[]>(() =>
    this.departments.value().map((d) => ({
      value: d.code,
      label: d.name,
      count: this.departmentCounts().get(d.code) ?? (this.facets.hasValue() ? 0 : undefined),
    })),
  );

  readonly statusOptions = computed<FilterOption[]>(() => {
    const counts = this.statusCounts();
    const processes = PROCESS_STATUSES.map((s) => ({ value: s, label: PROCESS_STATUS_LABELS[s] }));
    const contracts = CONTRACT_STATUSES.map((s) => ({
      value: s,
      label: CONTRACT_STATUS_LABELS[s],
    }));
    const options =
      this.kind() === 'contracts'
        ? contracts
        : this.scope === 'search'
          ? [...processes, ...contracts.filter((c) => !PROCESS_STATUSES.includes(c.value as never))]
          : processes;
    return options.map((o) => ({ ...o, count: counts.get(o.value) }));
  });

  readonly sourceOptions = computed<FilterOption[]>(() =>
    ['secop2', 'secop1'].map((value) => ({
      value,
      label: sourceLabel(value),
      count: this.sourceCounts().get(value),
    })),
  );

  readonly modalityOptions: FilterOption[] = MODALITIES.map((m) => ({ value: m, label: m }));

  /** ¿Aplican "Solo vigentes" y "Solo competitivos"? Solo a procesos (y búsqueda cruzada). */
  readonly showsProcessToggles = computed(() => this.kind() === 'processes');
  /** Texto, entidad, montos y orden: no existen en las estadísticas. */
  readonly showsSearchFields = this.scope !== 'stats';

  industryName(id: string): string {
    return this.industries.value().find((i) => i.id === id)?.name ?? id;
  }

  departmentName(code: string): string {
    return this.departments.value().find((d) => d.code === code)?.name ?? code;
  }

  /** "Cajicá (Cundinamarca)". */
  municipalityLabel(code: string): string {
    const found = this.selectedMunicipalities.value().find((m) => m.divipolaCode === code);
    return found ? `${found.name} (${found.departmentName})` : code;
  }
}

/** Proveedores de una pantalla con filtros: estado en la URL y datos de apoyo. */
export function provideFilters(scope: FilterScope): Provider[] {
  return [
    FilterStateService,
    FilterLookups,
    FilterDrawer,
    { provide: FILTER_SCOPE, useValue: scope },
  ];
}
