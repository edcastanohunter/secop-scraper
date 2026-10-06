import { delay, http, HttpResponse } from 'msw';

import {
  CreateLocationAliasRequest,
  CreateSavedSearchRequest,
  QueueIngestionRunRequest,
  SavedSearchFilter,
  UpdateSavedSearchRequest,
  UpsertIndustryMappingRequest,
} from '../api/models';
import { apiUrl } from '../core/config/api-url';
import { MockDb, Outcome } from './db';
import { freshnessFixture } from './fixtures/meta';
import {
  COUNT_CAP,
  fold,
  problem,
  ProblemBody,
  Query,
  readQuery,
  requireDates,
  searchContracts,
  searchOpportunities,
  searchProcesses,
  statsByIndustry,
  statsByLocation,
  statsFacets,
  statsRows,
  statsSummary,
  statsTimeSeries,
  statsTopEntities,
  toCsv,
  validateQuery,
  validation,
  withDefaultDates,
} from './query';

/** Latencia simulada para que se vean los skeletons. */
const LATENCY_MS = 250;
/** Filas de la exportación real como máximo; `q=todo` simula superarlas (422). */
const EXPORT_MAX_ROWS = 50_000;
/** Texto de búsqueda que simula un resultado enorme: `totalCountIsCapped` y export 422. */
export const HUGE_QUERY = 'todo';

export const db = new MockDb();

function problemResponse(body: ProblemBody): HttpResponse<ProblemBody> {
  return HttpResponse.json(body, {
    status: body.status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

function reply<T>(outcome: Outcome<T>, status = 200) {
  if (!outcome.ok) return problemResponse(outcome.problem);
  if (status === 204) return new HttpResponse(null, { status });
  return HttpResponse.json(outcome.value as object, { status });
}

async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return ((await request.json()) as Partial<T>) ?? {};
  } catch {
    return {};
  }
}

/** Valida la consulta y aplica el truco de `q=todo` (sin filtrar por texto, total con tope). */
function listQuery(request: Request): { query: Query; huge: boolean } | ProblemBody {
  const query = readQuery(new URL(request.url).searchParams);
  const invalid = validateQuery(query);
  if (invalid) return invalid;
  const huge = fold(query.q.trim()) === HUGE_QUERY;
  return { query: huge ? { ...query, q: '' } : query, huge };
}

function capped<T extends { totalCount: number; totalCountIsCapped: boolean }>(
  page: T,
  huge: boolean,
): T {
  return huge ? { ...page, totalCount: COUNT_CAP, totalCountIsCapped: true } : page;
}

function isProblem(value: unknown): value is ProblemBody {
  return typeof value === 'object' && value !== null && 'status' in value && 'title' in value;
}

function filterParams(
  filter: SavedSearchFilter,
  page: string | null,
  pageSize: string | null,
  sort: string | null,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value === null || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, String(item));
  }
  params.set('page', page ?? '1');
  params.set('pageSize', pageSize ?? '20');
  if (sort) params.set('sort', sort);
  return params;
}

function paged<T>(items: T[], request: Request) {
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize') ?? 20) || 20));
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    totalCount: items.length,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

function statsQuery(
  request: Request,
  datesRequired: boolean,
): { query: Query; kind: string | null } | ProblemBody {
  const params = new URL(request.url).searchParams;
  const kind = params.get('kind');
  if (kind && !['processes', 'contracts'].includes(kind)) {
    return validation([{ code: 'Kind', description: 'The kind must be processes or contracts.' }]);
  }
  const query = readQuery(params);
  if (datesRequired) {
    const missing = requireDates(query);
    if (missing) return missing;
    const span = Date.parse(query.dateTo) - Date.parse(query.dateFrom);
    if (span > 3 * 366 * 24 * 60 * 60 * 1000) {
      return validation([{ code: 'DateTo', description: 'The range cannot exceed 3 years.' }]);
    }
  }
  return { query: datesRequired ? query : withDefaultDates(query, Date.now()), kind };
}

export const handlers = [
  // ── Meta ────────────────────────────────────────────────────────────────────────────
  http.get(apiUrl('/meta/freshness'), async () => {
    await delay(LATENCY_MS);
    return HttpResponse.json(freshnessFixture());
  }),

  // ── Catálogos ───────────────────────────────────────────────────────────────────────
  http.get(apiUrl('/catalog/departments'), async () => {
    await delay(LATENCY_MS);
    return HttpResponse.json(db.departments);
  }),
  http.get(apiUrl('/catalog/industries'), async () => {
    await delay(LATENCY_MS);
    return HttpResponse.json(db.industries);
  }),
  http.get(apiUrl('/catalog/municipalities'), async ({ request }) => {
    await delay(LATENCY_MS / 2);
    const params = new URL(request.url).searchParams;
    const department = params.get('departmentCode');
    const q = fold(params.get('q') ?? '');
    return HttpResponse.json(
      db.municipalities.filter(
        (m) => (!department || m.departmentCode === department) && (!q || fold(m.name).includes(q)),
      ),
    );
  }),
  http.get(apiUrl('/catalog/unresolved-locations'), async ({ request }) => {
    await delay(LATENCY_MS);
    const sorted = [...db.unresolved].sort((a, b) => b.occurrences - a.occurrences);
    return HttpResponse.json(paged(sorted, request));
  }),
  http.post(apiUrl('/catalog/location-aliases'), async ({ request }) => {
    await delay(LATENCY_MS);
    return reply(db.createAlias(await readJson<CreateLocationAliasRequest>(request)), 201);
  }),
  http.put(apiUrl('/catalog/industry-mappings/:prefix'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const body = await readJson<UpsertIndustryMappingRequest>(request);
    return reply(db.upsertMapping(String(params['prefix']), body.industryId), 204);
  }),
  http.delete(apiUrl('/catalog/industry-mappings/:prefix'), async ({ params }) => {
    await delay(LATENCY_MS);
    return reply(db.deleteMapping(String(params['prefix'])), 204);
  }),
  http.post(apiUrl('/catalog/divipola/refresh'), async () => {
    await delay(LATENCY_MS * 4);
    return HttpResponse.json({ departments: 33, municipalities: 1122 }, { status: 202 });
  }),

  // ── Búsqueda ────────────────────────────────────────────────────────────────────────
  http.get(apiUrl('/processes/export'), async ({ request }) => exportCsv(request, 'processes')),
  http.get(apiUrl('/contracts/export'), async ({ request }) => exportCsv(request, 'contracts')),
  http.get(apiUrl('/processes'), async ({ request }) => {
    await delay(LATENCY_MS);
    const parsed = listQuery(request);
    if (isProblem(parsed)) return problemResponse(parsed);
    return HttpResponse.json(
      capped(searchProcesses(db.processes, parsed.query, Date.now()), parsed.huge),
    );
  }),
  http.get(apiUrl('/processes/:source/:sourceId'), async ({ params }) => {
    await delay(LATENCY_MS);
    return reply(db.process(String(params['source']), String(params['sourceId'])));
  }),
  http.get(apiUrl('/contracts'), async ({ request }) => {
    await delay(LATENCY_MS);
    const parsed = listQuery(request);
    if (isProblem(parsed)) return problemResponse(parsed);
    return HttpResponse.json(
      capped(searchContracts(db.contracts, parsed.query, Date.now()), parsed.huge),
    );
  }),
  http.get(apiUrl('/contracts/:source/:sourceId'), async ({ params }) => {
    await delay(LATENCY_MS);
    return reply(db.contract(String(params['source']), String(params['sourceId'])));
  }),
  http.get(apiUrl('/search'), async ({ request }) => {
    await delay(LATENCY_MS);
    const parsed = listQuery(request);
    if (isProblem(parsed)) return problemResponse(parsed);
    return HttpResponse.json(
      capped(
        searchOpportunities(db.processes, db.contracts, parsed.query, Date.now()),
        parsed.huge,
      ),
    );
  }),

  // ── Enriquecimiento y scraping ──────────────────────────────────────────────────────
  http.get(apiUrl('/processes/secop2/:sourceId/enrichment'), async ({ params }) => {
    await delay(LATENCY_MS);
    return reply(db.getEnrichment(String(params['sourceId'])));
  }),
  http.post(apiUrl('/processes/secop2/:sourceId/enrichment'), async ({ params }) => {
    await delay(LATENCY_MS);
    return reply(db.requestEnrichment(String(params['sourceId'])), 202);
  }),
  http.get(apiUrl('/scraping/status'), async () => {
    await delay(LATENCY_MS);
    return HttpResponse.json(db.scrapingStatus());
  }),

  // ── Estadísticas ────────────────────────────────────────────────────────────────────
  http.get(apiUrl('/stats/summary'), async ({ request }) => {
    await delay(LATENCY_MS);
    const parsed = statsQuery(request, false);
    if (isProblem(parsed)) return problemResponse(parsed);
    const rows = statsRows(db.processes, db.contracts, parsed.kind);
    return HttpResponse.json(statsSummary(rows, parsed.query, parsed.kind, Date.now()));
  }),
  http.get(apiUrl('/stats/facets'), async ({ request }) => {
    await delay(LATENCY_MS);
    const parsed = statsQuery(request, false);
    if (isProblem(parsed)) return problemResponse(parsed);
    const rows = statsRows(db.processes, db.contracts, parsed.kind);
    return HttpResponse.json(statsFacets(rows, parsed.query, Date.now()));
  }),
  http.get(apiUrl('/stats/timeseries'), async ({ request }) => {
    await delay(LATENCY_MS);
    const parsed = statsQuery(request, true);
    if (isProblem(parsed)) return problemResponse(parsed);
    const interval = new URL(request.url).searchParams.get('interval') ?? 'month';
    if (!['day', 'week', 'month'].includes(interval)) {
      return problemResponse(
        validation([{ code: 'Interval', description: 'The interval must be day, week or month.' }]),
      );
    }
    const rows = statsRows(db.processes, db.contracts, parsed.kind);
    return HttpResponse.json(statsTimeSeries(rows, parsed.query, interval, Date.now()));
  }),
  http.get(apiUrl('/stats/by-industry'), async ({ request }) => {
    await delay(LATENCY_MS);
    const parsed = statsQuery(request, true);
    if (isProblem(parsed)) return problemResponse(parsed);
    const rows = statsRows(db.processes, db.contracts, parsed.kind);
    return HttpResponse.json(statsByIndustry(rows, parsed.query, Date.now()));
  }),
  http.get(apiUrl('/stats/by-location'), async ({ request }) => {
    await delay(LATENCY_MS);
    const parsed = statsQuery(request, true);
    if (isProblem(parsed)) return problemResponse(parsed);
    const level = new URL(request.url).searchParams.get('level') ?? 'department';
    if (level === 'municipality' && parsed.query.department.length === 0) {
      return problemResponse(
        validation([
          { code: 'Level', description: 'level=municipality needs a department filter.' },
        ]),
      );
    }
    const rows = statsRows(db.processes, db.contracts, parsed.kind);
    return HttpResponse.json(statsByLocation(rows, parsed.query, level, Date.now()));
  }),
  http.get(apiUrl('/stats/top-entities'), async ({ request }) => {
    await delay(LATENCY_MS);
    const parsed = statsQuery(request, true);
    if (isProblem(parsed)) return problemResponse(parsed);
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 10);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      return problemResponse(
        validation([{ code: 'Limit', description: 'The limit must be between 1 and 50.' }]),
      );
    }
    const rows = statsRows(db.processes, db.contracts, parsed.kind);
    return HttpResponse.json(statsTopEntities(rows, parsed.query, limit, Date.now()));
  }),

  // ── Búsquedas guardadas ─────────────────────────────────────────────────────────────
  http.get(apiUrl('/saved-searches'), async () => {
    await delay(LATENCY_MS);
    return HttpResponse.json(db.savedSearches);
  }),
  http.post(apiUrl('/saved-searches'), async ({ request }) => {
    await delay(LATENCY_MS);
    return reply(db.createSavedSearch(await readJson<CreateSavedSearchRequest>(request)), 201);
  }),
  http.get(apiUrl('/saved-searches/:id'), async ({ params }) => {
    await delay(LATENCY_MS);
    return reply(db.savedSearch(String(params['id'])));
  }),
  http.put(apiUrl('/saved-searches/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const body = await readJson<UpdateSavedSearchRequest>(request);
    return reply(db.updateSavedSearch(String(params['id']), body));
  }),
  http.delete(apiUrl('/saved-searches/:id'), async ({ params }) => {
    await delay(LATENCY_MS);
    return reply(db.deleteSavedSearch(String(params['id'])), 204);
  }),
  http.post(apiUrl('/saved-searches/:id/pause'), async ({ params }) => {
    await delay(LATENCY_MS);
    return reply(db.setPaused(String(params['id']), true), 204);
  }),
  http.post(apiUrl('/saved-searches/:id/resume'), async ({ params }) => {
    await delay(LATENCY_MS);
    return reply(db.setPaused(String(params['id']), false), 204);
  }),
  http.get(apiUrl('/saved-searches/:id/results'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const found = db.savedSearch(String(params['id']));
    if (!found.ok) return problemResponse(found.problem);
    const search = found.value;
    const url = new URL(request.url).searchParams;
    const query = readQuery(
      filterParams(search.filters, url.get('page'), url.get('pageSize'), url.get('sort')),
    );
    const invalid = validateQuery(query);
    if (invalid) return problemResponse(invalid);
    return HttpResponse.json(
      search.kind === 'processes'
        ? searchProcesses(db.processes, query, Date.now())
        : searchContracts(db.contracts, query, Date.now()),
    );
  }),
  http.get(apiUrl('/saved-searches/:id/deliveries'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const found = db.savedSearch(String(params['id']));
    if (!found.ok) return problemResponse(found.problem);
    return HttpResponse.json(paged(db.deliveries.get(found.value.id) ?? [], request));
  }),

  // ── Ingesta ─────────────────────────────────────────────────────────────────────────
  http.get(apiUrl('/ingestion/runs'), async ({ request }) => {
    await delay(LATENCY_MS);
    const params = new URL(request.url).searchParams;
    const datasetKey = params.get('datasetKey');
    const status = params.get('status');
    const runs = db
      .listRuns()
      .filter(
        (r) => (!datasetKey || r.datasetKey === datasetKey) && (!status || r.status === status),
      );
    return HttpResponse.json(paged(runs, request));
  }),
  http.get(apiUrl('/ingestion/runs/:id'), async ({ params }) => {
    await delay(LATENCY_MS);
    return reply(db.getRun(String(params['id'])));
  }),
  http.post(apiUrl('/ingestion/runs'), async ({ request }) => {
    await delay(LATENCY_MS);
    return reply(db.queueRun(await readJson<QueueIngestionRunRequest>(request)), 202);
  }),
  http.get(apiUrl('/ingestion/checkpoints'), async () => {
    await delay(LATENCY_MS);
    return HttpResponse.json(db.checkpoints);
  }),
];

async function exportCsv(request: Request, kind: 'processes' | 'contracts') {
  await delay(LATENCY_MS * 2);
  const parsed = listQuery(request);
  if (isProblem(parsed)) return problemResponse(parsed);
  if (parsed.huge) {
    return problemResponse(
      problem(
        422,
        'Export.TooManyRows',
        `The filters match 61234 rows and an export holds at most ${EXPORT_MAX_ROWS}. Narrow the filters.`,
      ),
    );
  }
  const query = { ...parsed.query, page: 1, pageSize: 100 };
  const today = new Date().toISOString().slice(0, 10);
  let csv: string;
  if (kind === 'processes') {
    const page = searchProcesses(db.processes, query, Date.now());
    csv = toCsv(
      [
        'Fuente',
        'Id',
        'Referencia',
        'Título',
        'Entidad',
        'Municipio',
        'Estado',
        'Vigente',
        'Precio base',
        'Publicado',
        'Cierre',
      ],
      page.items.map((p) => [
        p.source,
        p.sourceId,
        p.reference,
        p.title,
        p.entityName,
        p.location.municipalityName,
        p.status,
        p.isActive,
        p.basePrice,
        p.publishedAt,
        p.offersDeadlineAt,
      ]),
    );
  } else {
    const page = searchContracts(db.contracts, query, Date.now());
    csv = toCsv(
      [
        'Fuente',
        'Id',
        'Referencia',
        'Objeto',
        'Entidad',
        'Municipio',
        'Estado',
        'Valor',
        'Contratista',
        'Firmado',
      ],
      page.items.map((c) => [
        c.source,
        c.sourceId,
        c.reference,
        c.description,
        c.entityName,
        c.location.municipalityName,
        c.status,
        c.value,
        c.supplierName,
        c.signedAt,
      ]),
    );
  }
  const filename = `${kind}-${today}.csv`;
  return new HttpResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
    },
  });
}
