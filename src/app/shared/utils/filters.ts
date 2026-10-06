import { ParamMap, Params } from '@angular/router';

import { SavedSearchFilter, SearchKind, SortOrder, Source } from '../../api/models';

/**
 * Estado de los filtros compartidos (SPEC 05). Vive en la URL: estas funciones son la única
 * traducción entre query params de la app, parámetros de la API y filtros de una búsqueda
 * guardada. Son puras para poder probarlas sin Angular.
 */
export interface SearchFilters {
  q: string;
  industry: string[];
  department: string[];
  municipality: string[];
  entity: string;
  source: Source | null;
  status: string[];
  modality: string[];
  minAmount: number | null;
  maxAmount: number | null;
  /** `yyyy-MM-dd` o `''`. */
  dateFrom: string;
  dateTo: string;
  onlyActive: boolean;
  competitiveOnly: boolean;
  sort: SortOrder | null;
  page: number;
  pageSize: number;
}

export const PAGE_SIZES = [20, 50, 100] as const;
export const MAX_PAGE_SIZE = 100;
/** La API rechaza `page × pageSize` por encima de 10.000. */
export const MAX_RESULT_WINDOW = 10_000;

const SOURCES: readonly Source[] = ['secop1', 'secop2'];
const SORTS: readonly SortOrder[] = [
  'relevance',
  'date_desc',
  'date_asc',
  'amount_desc',
  'amount_asc',
  'deadline_asc',
];

/** Valores por defecto de la API. Cada pantalla puede sobrescribirlos (ruta `data`). */
export const BASE_FILTERS: Readonly<SearchFilters> = {
  q: '',
  industry: [],
  department: [],
  municipality: [],
  entity: '',
  source: null,
  status: [],
  modality: [],
  minAmount: null,
  maxAmount: null,
  dateFrom: '',
  dateTo: '',
  onlyActive: false,
  competitiveOnly: true,
  sort: null,
  page: 1,
  pageSize: 20,
};

export type FilterDefaults = Partial<SearchFilters>;

export function withDefaults(defaults: FilterDefaults = {}): SearchFilters {
  return { ...BASE_FILTERS, ...defaults };
}

type FilterKey = keyof SearchFilters;
const ARRAY_KEYS = ['industry', 'department', 'municipality', 'status', 'modality'] as const;
const KEYS = Object.keys(BASE_FILTERS) as FilterKey[];

// ── URL de la app ─────────────────────────────────────────────────────────────────────

function parseNumber(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function parseDate(value: string | null): string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

/** Lee los filtros de la URL. Lo que falte o no se entienda toma el valor por defecto. */
export function parseFilters(params: ParamMap, defaults: FilterDefaults = {}): SearchFilters {
  const base = withDefaults(defaults);
  const source = params.get('source');
  const sort = params.get('sort');
  const page = parseNumber(params.get('page'));
  const pageSize = parseNumber(params.get('pageSize'));

  const filters: SearchFilters = {
    ...base,
    q: params.get('q')?.trim() ?? base.q,
    entity: params.get('entity')?.trim() ?? base.entity,
    source: SOURCES.includes(source as Source) ? (source as Source) : base.source,
    minAmount: parseNumber(params.get('minAmount')) ?? base.minAmount,
    maxAmount: parseNumber(params.get('maxAmount')) ?? base.maxAmount,
    dateFrom: parseDate(params.get('dateFrom')) || base.dateFrom,
    dateTo: parseDate(params.get('dateTo')) || base.dateTo,
    onlyActive: parseBoolean(params.get('onlyActive'), base.onlyActive),
    competitiveOnly: parseBoolean(params.get('competitiveOnly'), base.competitiveOnly),
    sort: SORTS.includes(sort as SortOrder) ? (sort as SortOrder) : base.sort,
    page: page !== null && Number.isInteger(page) && page >= 1 ? page : base.page,
    pageSize: PAGE_SIZES.includes(pageSize as (typeof PAGE_SIZES)[number])
      ? (pageSize as number)
      : base.pageSize,
  };
  for (const key of ARRAY_KEYS) {
    const values = params.getAll(key);
    filters[key] = values.length > 0 ? unique(values) : [...base[key]];
  }
  return filters;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, i) => value === b[i]);
  }
  return a === b;
}

/**
 * Query params para `router.navigate`. Lo que coincide con el valor por defecto va como
 * `null`, así `queryParamsHandling: 'merge'` lo quita y la URL queda corta y compartible.
 */
export function filtersToQueryParams(
  filters: SearchFilters,
  defaults: FilterDefaults = {},
): Params {
  const base = withDefaults(defaults);
  const params: Params = {};
  for (const key of KEYS) {
    const value = filters[key];
    const empty = value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty || sameValue(value, base[key])) {
      params[key] = null;
    } else {
      params[key] = Array.isArray(value) ? [...value] : String(value);
    }
  }
  return params;
}

/** Número de filtros activos distintos de los valores por defecto (sin orden ni paginación). */
export function countActiveFilters(filters: SearchFilters, defaults: FilterDefaults = {}): number {
  const base = withDefaults(defaults);
  return KEYS.filter((key) => !['sort', 'page', 'pageSize'].includes(key)).reduce((count, key) => {
    const value = filters[key];
    if (Array.isArray(value)) return count + value.length;
    return sameValue(value, base[key]) ? count : count + 1;
  }, 0);
}

// ── Parámetros de la API ──────────────────────────────────────────────────────────────

/**
 * Qué acepta cada endpoint (OpenAPI):
 * - `processes` y `search`: todos los filtros.
 * - `contracts`: sin `onlyActive` ni `competitiveOnly`.
 * - `stats`: sin `q`, `entity`, montos, orden ni paginación; añade `kind`.
 * - `export-*`: como su listado, sin paginación (la API la ignora).
 */
export type ApiScope =
  'processes' | 'contracts' | 'search' | 'stats' | 'export-processes' | 'export-contracts';

export type ApiParams = Record<string, string | string[]>;

const SCOPE_EXCLUDES: Record<ApiScope, readonly FilterKey[]> = {
  processes: [],
  search: [],
  contracts: ['onlyActive', 'competitiveOnly'],
  stats: ['q', 'entity', 'minAmount', 'maxAmount', 'sort', 'page', 'pageSize'],
  'export-processes': ['page', 'pageSize'],
  'export-contracts': ['onlyActive', 'competitiveOnly', 'page', 'pageSize'],
};

export function toApiParams(filters: SearchFilters, scope: ApiScope, kind?: SearchKind): ApiParams {
  // Vigentes y competitivos son conceptos de procesos: no se mandan con `kind=contracts`.
  const excluded: readonly FilterKey[] =
    scope === 'stats' && kind === 'contracts'
      ? [...SCOPE_EXCLUDES.stats, 'onlyActive', 'competitiveOnly']
      : SCOPE_EXCLUDES[scope];
  const params: ApiParams = {};
  for (const key of KEYS) {
    if (excluded.includes(key)) continue;
    const value = filters[key];
    if (Array.isArray(value)) {
      if (value.length > 0) params[key] = [...value];
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      params[key] = String(value);
    } else if (value) {
      params[key] = value;
    }
  }
  if (scope === 'stats' && kind) params['kind'] = kind;
  return params;
}

// ── Búsquedas guardadas ───────────────────────────────────────────────────────────────

function orNull<T>(value: T | '' | null, emptyArray = false): T | null {
  if (value === '' || value === null) return null;
  if (emptyArray && Array.isArray(value) && value.length === 0) return null;
  return value;
}

/** Filtros de la pantalla → `SavedSearchFilter` (sin orden ni paginación). */
export function toSavedSearchFilter(filters: SearchFilters, kind: SearchKind): SavedSearchFilter {
  const processes = kind === 'processes';
  return {
    q: orNull(filters.q),
    industry: orNull(filters.industry, true),
    department: orNull(filters.department, true),
    municipality: orNull(filters.municipality, true),
    entity: orNull(filters.entity),
    source: filters.source,
    status: orNull(filters.status, true),
    onlyActive: processes ? filters.onlyActive : null,
    competitiveOnly: processes ? filters.competitiveOnly : null,
    modality: orNull(filters.modality, true),
    minAmount: filters.minAmount,
    maxAmount: filters.maxAmount,
    dateFrom: orNull(filters.dateFrom),
    dateTo: orNull(filters.dateTo),
  };
}

/** `SavedSearchFilter` → filtros de pantalla (para resumirlos o reutilizarlos). */
export function fromSavedSearchFilter(filter: SavedSearchFilter): SearchFilters {
  return {
    ...BASE_FILTERS,
    q: filter.q ?? '',
    industry: filter.industry ?? [],
    department: filter.department ?? [],
    municipality: filter.municipality ?? [],
    entity: filter.entity ?? '',
    source: SOURCES.includes(filter.source as Source) ? (filter.source as Source) : null,
    status: filter.status ?? [],
    modality: filter.modality ?? [],
    minAmount: filter.minAmount ?? null,
    maxAmount: filter.maxAmount ?? null,
    dateFrom: filter.dateFrom ?? '',
    dateTo: filter.dateTo ?? '',
    onlyActive: filter.onlyActive ?? false,
    competitiveOnly: filter.competitiveOnly ?? true,
  };
}

/** `SavedSearchFilter` → query params de la app, para abrir el listado con esos filtros. */
export function savedFilterToQueryParams(filter: SavedSearchFilter): Params {
  const params: Params = {};
  for (const [key, value] of Object.entries(filter)) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params[key] = value;
    } else {
      params[key] = String(value);
    }
  }
  return params;
}

// ── Validación y fechas ───────────────────────────────────────────────────────────────

/** Prefijo UNSPSC de 2, 4, 6 u 8 dígitos (SPEC 01). */
export const UNSPSC_PREFIX_PATTERN = /^\d{2}(\d{2}){0,3}$/;

export function isValidUnspscPrefix(prefix: string): boolean {
  return UNSPSC_PREFIX_PATTERN.test(prefix);
}

/** La página más alta que la API acepta para un tamaño de página. */
export function maxPageFor(pageSize: number): number {
  return Math.floor(MAX_RESULT_WINDOW / Math.min(pageSize, MAX_PAGE_SIZE));
}

/** Fecha `yyyy-MM-dd` en Colombia (UTC-5, sin horario de verano). */
export function bogotaDate(epochMs: number): string {
  return new Date(epochMs - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Últimos 12 meses hasta hoy en Bogotá: rango por defecto del panel. */
export function defaultDateRange(now: number): { dateFrom: string; dateTo: string } {
  const dateTo = bogotaDate(now);
  const [year, month, day] = dateTo.split('-').map(Number);
  const from = new Date(Date.UTC(year - 1, month - 1, day));
  from.setUTCDate(from.getUTCDate() + 1);
  return { dateFrom: from.toISOString().slice(0, 10), dateTo };
}
