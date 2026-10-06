import { MockDb } from './db';
import { BLOCKED_PROCESS_ID } from './fixtures/procurement';
import {
  parseText,
  readQuery,
  searchProcesses,
  statsFacets,
  statsRows,
  statsTimeSeries,
  validateQuery,
} from './query';

/** Los e2e confían en que los mocks se comporten como la API: esto lo comprueba. */
describe('mocks de la API', () => {
  const now = Date.parse('2026-10-05T15:00:00Z');
  let clock = now;
  let db: MockDb;

  beforeEach(() => {
    clock = now;
    db = new MockDb(() => clock);
  });

  const query = (search: string) => readQuery(new URLSearchParams(search));

  it('Software en Cajicá, vigente y competitivo, encuentra los procesos fijados', () => {
    const page = searchProcesses(
      db.processes,
      query('industry=software&municipality=25126&onlyActive=true&competitiveOnly=true'),
      now,
    );

    expect(page.totalCount).toBeGreaterThanOrEqual(2);
    expect(page.items.every((p) => p.isActive && p.location.divipolaCode === '25126')).toBe(true);
    expect(page.items.every((p) => p.industries.some((i) => i.id === 'software'))).toBe(true);
  });

  it('competitiveOnly por defecto deja fuera la contratación directa', () => {
    const competitive = searchProcesses(db.processes, query('pageSize=100'), now);
    const all = searchProcesses(db.processes, query('pageSize=100&competitiveOnly=false'), now);

    expect(all.totalCount).toBeGreaterThan(competitive.totalCount);
    expect(competitive.items.every((p) => p.isCompetitive)).toBe(true);
  });

  it('pagina y ordena por monto', () => {
    const page = searchProcesses(
      db.processes,
      query('sort=amount_desc&pageSize=5&page=2&competitiveOnly=false'),
      now,
    );
    const amounts = page.items.map((p) => p.basePrice ?? 0);

    expect(page.items).toHaveLength(5);
    expect([...amounts].sort((a, b) => b - a)).toEqual(amounts);
  });

  it('valida como el backend', () => {
    expect(validateQuery(query('pageSize=500'))?.errors?.[0].code).toBe('PageSize');
    expect(validateQuery(query('sort=relevance'))?.errors?.[0].description).toContain(
      'needs a text query',
    );
    expect(validateQuery(query('page=200&pageSize=100'))?.status).toBe(400);
    expect(validateQuery(query('q=aseo&sort=relevance'))).toBeNull();
  });

  it('sintaxis de texto: frases, exclusiones y OR', () => {
    expect(parseText('"obra civil" -interventoría OR vías')).toEqual({
      any: [['obra civil'], ['vias']],
      none: ['interventoria'],
    });
  });

  it('cada facet ignora su propio filtro', () => {
    const rows = statsRows(db.processes, db.contracts, 'processes');
    const facets = statsFacets(rows, query('industry=software&competitiveOnly=false'), now);

    expect(facets.industries.length).toBeGreaterThan(1);
    expect(facets.departments.reduce((sum, d) => sum + d.count, 0)).toBeLessThan(
      db.processes.length,
    );
  });

  it('la serie temporal incluye periodos en cero', () => {
    const rows = statsRows(db.processes, db.contracts, 'processes');
    const series = statsTimeSeries(
      rows,
      query('dateFrom=2026-09-01&dateTo=2026-10-05&industry=salud'),
      'week',
      now,
    );

    expect(series.items[0].periodStart).toBe('2026-08-31');
    expect(series.items.some((p) => p.count === 0)).toBe(true);
  });

  it('búsquedas guardadas: nombre repetido (409), límite (422) y alta', () => {
    const base = { kind: 'processes' as const, filters: {}, frequency: 'daily' as const };
    expect(db.createSavedSearch({ ...base, name: 'Software en Cajicá y Chía' })).toMatchObject({
      ok: false,
      problem: { status: 409, errorCode: 'SavedSearch.NameTaken' },
    });
    for (let i = db.savedSearches.length; i < 20; i++) {
      expect(db.createSavedSearch({ ...base, name: `Búsqueda ${i}` }).ok).toBe(true);
    }
    expect(db.createSavedSearch({ ...base, name: 'Una más' })).toMatchObject({
      ok: false,
      problem: { status: 422, errorCode: 'SavedSearch.LimitReached' },
    });
  });

  it('enriquecimiento: 503 HostBlocked con blockedUntil y paso a succeeded', () => {
    const blocked = db.requestEnrichment(BLOCKED_PROCESS_ID);
    expect(blocked).toMatchObject({
      ok: false,
      problem: { status: 503, errorCode: 'Scraping.HostBlocked' },
    });
    expect(blocked.ok ? null : blocked.problem['blockedUntil']).toEqual(expect.any(String));

    const id = db.processes[0].sourceId;
    expect(db.requestEnrichment(id)).toMatchObject({ ok: true, value: { status: 'running' } });
    expect(db.requestEnrichment(id)).toMatchObject({ ok: false, problem: { status: 409 } });
    clock += 3000;
    expect(db.getEnrichment(id)).toMatchObject({ ok: true, value: { status: 'succeeded' } });
  });

  it('ingesta: refresh-open solo para secop2-processes, 409 con un run activo y progreso', () => {
    expect(db.queueRun({ datasetKey: 'secop2-contracts', mode: 'refresh-open' })).toMatchObject({
      ok: false,
      problem: { status: 400 },
    });
    const queued = db.queueRun({ datasetKey: 'secop1-processes', mode: 'incremental' });
    expect(queued.ok).toBe(true);
    expect(db.queueRun({ datasetKey: 'secop1-processes', mode: 'reconcile' })).toMatchObject({
      ok: false,
      problem: { status: 409 },
    });

    const id = queued.ok ? queued.value.runId : '';
    clock += 12_000;
    expect(db.getRun(id)).toMatchObject({ ok: true, value: { status: 'running' } });
    clock += 20_000;
    expect(db.getRun(id)).toMatchObject({ ok: true, value: { status: 'succeeded' } });
  });

  it('catálogo: crear un alias resuelve la ubicación pendiente', () => {
    const pending = db.unresolved[0];
    const result = db.createAlias({
      departmentRaw: pending.departmentRaw,
      municipalityRaw: pending.municipalityRaw,
      divipolaCode: '25126',
    });

    expect(result.ok).toBe(true);
    expect(db.unresolved).not.toContainEqual(pending);
    expect(db.createAlias({ municipalityRaw: 'x', divipolaCode: '99999' })).toMatchObject({
      ok: false,
      problem: { status: 404 },
    });
  });
});
