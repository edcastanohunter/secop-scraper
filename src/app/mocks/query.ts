import {
  Attribution,
  ContractDetail,
  ContractSummary,
  EntityBucket,
  FacetValue,
  Facets,
  IndustryBucket,
  IndustryRef,
  Location,
  LocationBucket,
  OpportunityItem,
  ProcessDetail,
  ProcessSummary,
  SearchPage,
  StatsList,
  StatsSummary,
  TimeSeriesPoint,
} from '../api/models';
import { freshnessFixture } from './fixtures/meta';

/**
 * Motor de consulta de los mocks: imita la semántica de la API (SPEC 05/06) sobre los
 * fixtures para que `start:mock` y los e2e se comporten como el backend. Solo existe en modo
 * mock; la app nunca filtra ni recalcula en el cliente.
 */

export const ATTRIBUTION: Attribution = {
  text: 'Fuente: Colombia Compra Eficiente – SECOP, vía datos.gov.co',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
};

const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_PAGE_SIZE = 100;
export const MAX_RESULT_WINDOW = 10_000;
/** Por encima de este total, la API dice `totalCountIsCapped` (mock: bajo para poder probarlo). */
export const COUNT_CAP = 10_000;

export interface ProblemBody {
  status: number;
  title: string;
  detail?: string;
  type?: string;
  errorCode?: string;
  errors?: { code: string; description: string }[];
  traceId?: string;
  [extension: string]: unknown;
}

const TITLES: Record<number, string> = {
  400: 'Validation failed',
  404: 'Not found',
  409: 'Conflict',
  422: 'Unprocessable request',
  503: 'Service unavailable',
};

export function problem(
  status: number,
  errorCode: string,
  detail: string,
  extra: Partial<ProblemBody> = {},
): ProblemBody {
  return {
    type: 'https://tools.ietf.org/html/rfc9110',
    title: TITLES[status] ?? 'Error',
    status,
    detail,
    errorCode,
    traceId: `00-${Math.random().toString(16).slice(2, 18).padEnd(16, '0')}-01`,
    ...extra,
  };
}

export function validation(errors: { code: string; description: string }[]): ProblemBody {
  return problem(400, 'General.Validation', 'One or more validation errors occurred', { errors });
}

// ── Filas normalizadas ────────────────────────────────────────────────────────────────

type Kind = 'process' | 'contract';

interface Row {
  kind: Kind;
  source: string;
  sourceId: string;
  title: string;
  text: string;
  entityName: string;
  entityNit: string | null;
  location: Location;
  industries: IndustryRef[];
  status: string;
  isActive: boolean;
  isCompetitive: boolean;
  modality: string | null;
  amount: number | null;
  awarded: boolean;
  awardedValue: number | null;
  date: string | null;
  deadline: string | null;
}

export function processRow(p: ProcessDetail): Row {
  return {
    kind: 'process',
    source: p.source,
    sourceId: p.sourceId,
    title: p.title,
    text: `${p.title} ${p.description ?? ''} ${p.entityName} ${p.reference ?? ''}`,
    entityName: p.entityName,
    entityNit: p.entityNit,
    location: p.location,
    industries: p.industries,
    status: p.status,
    isActive: p.isActive,
    isCompetitive: p.isCompetitive,
    modality: p.modality,
    amount: p.basePrice,
    awarded: p.awarded,
    awardedValue: p.awardedValue,
    date: p.publishedAt,
    deadline: p.offersDeadlineAt,
  };
}

export function contractRow(c: ContractDetail): Row {
  return {
    kind: 'contract',
    source: c.source,
    sourceId: c.sourceId,
    title: c.description,
    text: `${c.description} ${c.entityName} ${c.supplierName ?? ''} ${c.reference ?? ''}`,
    entityName: c.entityName,
    entityNit: c.entityNit,
    location: c.location,
    industries: c.industries,
    status: c.status,
    isActive: false,
    isCompetitive: true,
    modality: c.modality,
    amount: c.value,
    awarded: false,
    awardedValue: null,
    date: c.signedAt,
    deadline: null,
  };
}

// ── Parámetros ────────────────────────────────────────────────────────────────────────

export interface Query {
  q: string;
  industry: string[];
  department: string[];
  municipality: string[];
  entity: string;
  source: string;
  status: string[];
  modality: string[];
  minAmount: number | null;
  maxAmount: number | null;
  dateFrom: string;
  dateTo: string;
  onlyActive: boolean;
  competitiveOnly: boolean | null;
  sort: string;
  page: number;
  pageSize: number;
}

function num(value: string | null): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function bool(value: string | null): boolean | null {
  return value === null ? null : value === 'true';
}

export function readQuery(params: URLSearchParams): Query {
  return {
    q: params.get('q') ?? '',
    industry: params.getAll('industry'),
    department: params.getAll('department'),
    municipality: params.getAll('municipality'),
    entity: params.get('entity') ?? '',
    source: params.get('source') ?? '',
    status: params.getAll('status'),
    modality: params.getAll('modality'),
    minAmount: num(params.get('minAmount')),
    maxAmount: num(params.get('maxAmount')),
    dateFrom: params.get('dateFrom') ?? '',
    dateTo: params.get('dateTo') ?? '',
    onlyActive: bool(params.get('onlyActive')) ?? false,
    competitiveOnly: bool(params.get('competitiveOnly')),
    sort: params.get('sort') ?? 'date_desc',
    page: num(params.get('page')) ?? 1,
    pageSize: num(params.get('pageSize')) ?? 20,
  };
}

const SORTS = ['relevance', 'date_desc', 'date_asc', 'amount_desc', 'amount_asc', 'deadline_asc'];

/** Las mismas reglas que `SearchFilterValidator` del backend (mensajes en inglés, como allí). */
export function validateQuery(query: Query): ProblemBody | null {
  const errors: { code: string; description: string }[] = [];
  if (!Number.isInteger(query.page) || query.page < 1) {
    errors.push({ code: 'Page', description: 'The page must be 1 or greater.' });
  }
  if (!Number.isInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > MAX_PAGE_SIZE) {
    errors.push({ code: 'PageSize', description: 'The page size must be between 1 and 100.' });
  }
  if (query.page * query.pageSize > MAX_RESULT_WINDOW) {
    errors.push({ code: 'Page', description: 'page × pageSize cannot exceed 10000.' });
  }
  if (!SORTS.includes(query.sort)) {
    errors.push({ code: 'Sort', description: 'The sort is not valid.' });
  } else if (query.sort === 'relevance' && !query.q.trim()) {
    errors.push({ code: 'Sort', description: 'sort=relevance needs a text query (q).' });
  }
  for (const [code, value] of [
    ['MinAmount', query.minAmount],
    ['MaxAmount', query.maxAmount],
  ] as const) {
    if (value !== null && (Number.isNaN(value) || value < 0)) {
      errors.push({ code, description: 'Amounts must be zero or greater.' });
    }
  }
  if (query.minAmount !== null && query.maxAmount !== null && query.minAmount > query.maxAmount) {
    errors.push({ code: 'MaxAmount', description: 'maxAmount must be at least minAmount.' });
  }
  if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
    errors.push({ code: 'DateTo', description: 'dateTo must be on or after dateFrom.' });
  }
  if (query.source && !['secop1', 'secop2'].includes(query.source)) {
    errors.push({ code: 'Source', description: 'The source must be secop1 or secop2.' });
  }
  return errors.length > 0 ? validation(errors) : null;
}

// ── Texto ─────────────────────────────────────────────────────────────────────────────

export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

interface TextQuery {
  /** Alternativas separadas por `OR`; cada una es una lista de términos que deben estar. */
  any: string[][];
  none: string[];
}

/** Sintaxis web simplificada: `"frase"`, `-excluir` y `OR`. */
export function parseText(q: string): TextQuery {
  const tokens = fold(q).match(/-?"[^"]+"|\S+/g) ?? [];
  const any: string[][] = [[]];
  const none: string[] = [];
  for (const token of tokens) {
    if (token === 'or') {
      any.push([]);
      continue;
    }
    const negative = token.startsWith('-') && token.length > 1;
    const term = (negative ? token.slice(1) : token).replace(/^"|"$/g, '');
    if (!term) continue;
    if (negative) none.push(term);
    else any[any.length - 1].push(term);
  }
  return { any: any.filter((group) => group.length > 0), none };
}

function textScore(row: Row, text: TextQuery): number {
  const haystack = fold(row.text);
  if (text.none.some((term) => haystack.includes(term))) return 0;
  if (text.any.length === 0) return 1;
  let best = 0;
  for (const group of text.any) {
    if (group.every((term) => haystack.includes(term))) {
      const inTitle = group.filter((term) => fold(row.title).includes(term)).length;
      best = Math.max(best, 1 + group.length + inTitle);
    }
  }
  return best;
}

// ── Filtrado ──────────────────────────────────────────────────────────────────────────

type FilterKey = 'industry' | 'department' | 'status' | 'source';

/** `ignore` deja fuera un filtro: así se calculan los facets ("cada uno ignora el suyo"). */
export function matches(row: Row, query: Query, ignore?: FilterKey): boolean {
  if (query.q.trim() && textScore(row, parseText(query.q)) === 0) return false;
  if (
    ignore !== 'industry' &&
    query.industry.length > 0 &&
    !row.industries.some((i) => query.industry.includes(i.id))
  ) {
    return false;
  }
  if (
    ignore !== 'department' &&
    query.department.length > 0 &&
    !query.department.includes(row.location.departmentCode ?? '')
  ) {
    return false;
  }
  if (
    query.municipality.length > 0 &&
    !query.municipality.includes(row.location.divipolaCode ?? '')
  ) {
    return false;
  }
  if (query.entity && !fold(row.entityName).includes(fold(query.entity))) return false;
  if (ignore !== 'source' && query.source && row.source !== query.source) return false;
  if (ignore !== 'status' && query.status.length > 0 && !query.status.includes(row.status)) {
    return false;
  }
  if (query.modality.length > 0 && !query.modality.includes(row.modality ?? '')) return false;
  if (query.minAmount !== null && (row.amount ?? 0) < query.minAmount) return false;
  if (query.maxAmount !== null && (row.amount ?? 0) > query.maxAmount) return false;
  const day = row.date?.slice(0, 10) ?? '';
  if (query.dateFrom && day < query.dateFrom) return false;
  if (query.dateTo && day > query.dateTo) return false;
  if (row.kind === 'process') {
    if (query.onlyActive && !row.isActive) return false;
    if ((query.competitiveOnly ?? true) && !row.isCompetitive) return false;
  }
  return true;
}

function compare(sort: string, text: TextQuery) {
  const time = (value: string | null) => (value ? Date.parse(value) : 0);
  return (a: Row, b: Row): number => {
    switch (sort) {
      case 'relevance':
        return textScore(b, text) - textScore(a, text) || time(b.date) - time(a.date);
      case 'date_asc':
        return time(a.date) - time(b.date);
      case 'amount_desc':
        return (b.amount ?? -1) - (a.amount ?? -1);
      case 'amount_asc':
        return (a.amount ?? Infinity) - (b.amount ?? Infinity);
      case 'deadline_asc':
        return (time(a.deadline) || Infinity) - (time(b.deadline) || Infinity);
      default:
        return time(b.date) - time(a.date);
    }
  };
}

function page<T, R extends Row>(
  rows: R[],
  query: Query,
  map: (row: R) => T,
  now: number,
): SearchPage<T> {
  const sorted = [...rows].sort(compare(query.sort, parseText(query.q)));
  const start = (query.page - 1) * query.pageSize;
  return {
    items: sorted.slice(start, start + query.pageSize).map(map),
    page: query.page,
    pageSize: query.pageSize,
    totalCount: Math.min(rows.length, COUNT_CAP),
    totalCountIsCapped: rows.length > COUNT_CAP,
    attribution: ATTRIBUTION,
    freshness: freshnessFixture(now),
  };
}

export function toProcessSummary(p: ProcessDetail): ProcessSummary {
  return {
    source: p.source,
    sourceId: p.sourceId,
    reference: p.reference,
    title: p.title,
    entityName: p.entityName,
    location: p.location,
    industries: p.industries,
    status: p.status,
    isActive: p.isActive,
    isCompetitive: p.isCompetitive,
    modality: p.modality,
    basePrice: p.basePrice,
    publishedAt: p.publishedAt,
    offersDeadlineAt: p.offersDeadlineAt,
    awarded: p.awarded,
    awardedValue: p.awardedValue,
    url: p.url,
  };
}

export function toContractSummary(c: ContractDetail): ContractSummary {
  return {
    source: c.source,
    sourceId: c.sourceId,
    processSourceId: c.processSourceId,
    reference: c.reference,
    description: c.description,
    entityName: c.entityName,
    location: c.location,
    industries: c.industries,
    status: c.status,
    modality: c.modality,
    signedAt: c.signedAt,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    value: c.value,
    paidValue: c.paidValue,
    supplierName: c.supplierName,
    supplierNit: c.supplierNit,
    supplierIsSme: c.supplierIsSme,
    url: c.url,
  };
}

export function searchProcesses(
  processes: ProcessDetail[],
  query: Query,
  now: number,
): SearchPage<ProcessSummary> {
  const byId = new Map(processes.map((p) => [p.sourceId, p]));
  const rows = processes.map(processRow).filter((row) => matches(row, query));
  return page(rows, query, (row) => toProcessSummary(byId.get(row.sourceId)!), now);
}

export function searchContracts(
  contracts: ContractDetail[],
  query: Query,
  now: number,
): SearchPage<ContractSummary> {
  const byId = new Map(contracts.map((c) => [c.sourceId, c]));
  const rows = contracts.map(contractRow).filter((row) => matches(row, query));
  return page(rows, query, (row) => toContractSummary(byId.get(row.sourceId)!), now);
}

export function searchOpportunities(
  processes: ProcessDetail[],
  contracts: ContractDetail[],
  query: Query,
  now: number,
): SearchPage<OpportunityItem> {
  const rows = [...processes.map(processRow), ...contracts.map(contractRow)].filter((row) =>
    matches(row, query),
  );
  return page(
    rows,
    query,
    (row) => ({
      kind: row.kind,
      source: row.source as OpportunityItem['source'],
      sourceId: row.sourceId,
      title: row.title,
      entityName: row.entityName,
      location: row.location,
      industries: row.industries,
      status: row.status,
      isActive: row.isActive,
      amount: row.amount,
      date: row.date,
      offersDeadlineAt: row.deadline,
      url: null,
    }),
    now,
  );
}

// ── Estadísticas ──────────────────────────────────────────────────────────────────────

export type StatsKind = 'processes' | 'contracts';

export function statsRows(
  processes: ProcessDetail[],
  contracts: ContractDetail[],
  kind: string | null,
): Row[] {
  return kind === 'contracts' ? contracts.map(contractRow) : processes.map(processRow);
}

export function statsFreshness(now: number) {
  return {
    lastSyncedAt: freshnessFixture(now).lastSyncedAt,
    statsRefreshedAt: new Date(now - 40 * 60 * 1000).toISOString(),
  };
}

/** Sin fechas, los últimos 365 días (summary y facets); el resto de endpoints las exige. */
export function withDefaultDates(query: Query, now: number): Query {
  const today = new Date(now - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const yearAgo = new Date(now - 5 * 60 * 60 * 1000 - 365 * DAY_MS).toISOString().slice(0, 10);
  return { ...query, dateFrom: query.dateFrom || yearAgo, dateTo: query.dateTo || today };
}

export function requireDates(query: Query): ProblemBody | null {
  const errors: { code: string; description: string }[] = [];
  if (!query.dateFrom) errors.push({ code: 'DateFrom', description: 'dateFrom is required.' });
  if (!query.dateTo) errors.push({ code: 'DateTo', description: 'dateTo is required.' });
  return errors.length > 0 ? validation(errors) : null;
}

function statsEnvelope<T>(items: T[], now: number): StatsList<T> {
  return { items, attribution: ATTRIBUTION, freshness: statsFreshness(now) };
}

export function statsSummary(
  rows: Row[],
  query: Query,
  kind: string | null,
  now: number,
): StatsSummary {
  const matched = rows.filter((row) => matches(row, query));
  const processes = kind !== 'contracts';
  return {
    count: matched.length,
    totalAmount: matched.reduce((sum, row) => sum + (row.amount ?? 0), 0),
    awardedCount: processes ? matched.filter((row) => row.awarded).length : null,
    totalAwarded: processes ? matched.reduce((sum, row) => sum + (row.awardedValue ?? 0), 0) : null,
    activeCount: processes ? matched.filter((row) => row.isActive).length : null,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    attribution: ATTRIBUTION,
    freshness: statsFreshness(now),
  };
}

function periodStart(day: string, interval: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (interval === 'day') return day;
  if (interval === 'week') {
    const weekday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - weekday);
    return date.toISOString().slice(0, 10);
  }
  return `${day.slice(0, 7)}-01`;
}

function nextPeriod(day: string, interval: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (interval === 'day') date.setUTCDate(date.getUTCDate() + 1);
  else if (interval === 'week') date.setUTCDate(date.getUTCDate() + 7);
  else date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

export function statsTimeSeries(
  rows: Row[],
  query: Query,
  interval: string,
  now: number,
): StatsList<TimeSeriesPoint> {
  const buckets = new Map<string, TimeSeriesPoint>();
  for (
    let day = periodStart(query.dateFrom, interval);
    day <= query.dateTo;
    day = nextPeriod(day, interval)
  ) {
    buckets.set(day, { periodStart: day, count: 0, totalAmount: 0 });
  }
  for (const row of rows.filter((r) => matches(r, query))) {
    const bucket = buckets.get(periodStart(row.date?.slice(0, 10) ?? '', interval));
    if (bucket) {
      bucket.count += 1;
      bucket.totalAmount += row.amount ?? 0;
    }
  }
  return statsEnvelope([...buckets.values()], now);
}

function byKey<T extends { count: number; totalAmount: number }>(
  rows: Row[],
  keys: (row: Row) => [string, T][],
): T[] {
  const totals = new Map<string, T>();
  for (const row of rows) {
    for (const [key, seed] of keys(row)) {
      const bucket = totals.get(key) ?? seed;
      bucket.count += 1;
      bucket.totalAmount += row.amount ?? 0;
      totals.set(key, bucket);
    }
  }
  return [...totals.values()].sort((a, b) => b.count - a.count || b.totalAmount - a.totalAmount);
}

export function statsByIndustry(rows: Row[], query: Query, now: number): StatsList<IndustryBucket> {
  const items = byKey(
    rows.filter((row) => matches(row, query)),
    (row) =>
      row.industries.map((i) => [
        i.id,
        { industryId: i.id, industryName: i.name, count: 0, totalAmount: 0 },
      ]),
  );
  return statsEnvelope(items, now);
}

export function statsByLocation(
  rows: Row[],
  query: Query,
  level: string,
  now: number,
): StatsList<LocationBucket> {
  const municipality = level === 'municipality';
  const items = byKey(
    rows.filter((row) => matches(row, query)),
    (row) => {
      const code = municipality ? row.location.divipolaCode : row.location.departmentCode;
      const name = municipality ? row.location.municipalityName : row.location.departmentName;
      return [[code ?? '∅', { code, name, count: 0, totalAmount: 0 }]];
    },
  );
  return statsEnvelope(items, now);
}

export function statsTopEntities(
  rows: Row[],
  query: Query,
  limit: number,
  now: number,
): StatsList<EntityBucket> {
  const items = byKey(
    rows.filter((row) => matches(row, query)),
    (row) => [
      [
        row.entityName,
        { entityName: row.entityName, entityNit: row.entityNit, count: 0, totalAmount: 0 },
      ],
    ],
  );
  return statsEnvelope(items.slice(0, limit), now);
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  evaluation: 'En evaluación',
  awarded: 'Adjudicado',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
  unknown: 'Desconocido',
  signed: 'Firmado',
  in_progress: 'En ejecución',
  suspended: 'Suspendido',
  finished: 'Terminado',
};

function facet(rows: Row[], keys: (row: Row) => [string, string][]): FacetValue[] {
  const counts = new Map<string, FacetValue>();
  for (const row of rows) {
    for (const [value, label] of keys(row)) {
      const entry = counts.get(value) ?? { value, label, count: 0 };
      entry.count += 1;
      counts.set(value, entry);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

export function statsFacets(rows: Row[], query: Query, now: number): Facets {
  const without = (key: FilterKey) => rows.filter((row) => matches(row, query, key));
  return {
    industries: facet(without('industry'), (row) => row.industries.map((i) => [i.id, i.name])),
    departments: facet(without('department'), (row) =>
      row.location.departmentCode
        ? [[row.location.departmentCode, row.location.departmentName ?? '']]
        : [],
    ),
    statuses: facet(without('status'), (row) => [
      [row.status, STATUS_LABELS[row.status] ?? row.status],
    ]),
    sources: facet(without('source'), (row) => [
      [row.source, row.source === 'secop1' ? 'SECOP I' : 'SECOP II'],
    ]),
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    attribution: ATTRIBUTION,
    freshness: statsFreshness(now),
  };
}

// ── CSV ───────────────────────────────────────────────────────────────────────────────

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** UTF-8 con BOM y `;`, como la exportación real. */
export function toCsv(header: string[], rows: unknown[][]): string {
  return '\uFEFF' + [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
}
