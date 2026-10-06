import {
  AlertDelivery,
  ContractDetail,
  CreateSavedSearchRequest,
  DATASET_KEYS,
  DatasetKey,
  Department,
  Enrichment,
  INGESTION_MODES,
  Industry,
  IngestionMode,
  IngestionRun,
  Municipality,
  ProcessDetail,
  QueueIngestionRunRequest,
  SavedSearch,
  SavedSearchFilter,
  ScrapingStatus,
  SyncCheckpoint,
  UnresolvedLocation,
  UpdateSavedSearchRequest,
} from '../api/models';
import {
  DEPARTMENTS,
  INDUSTRIES,
  MUNICIPALITIES,
  unresolvedLocationsFixture,
} from './fixtures/catalog';
import { BLOCKED_PROCESS_ID, contractsFixture, processesFixture } from './fixtures/procurement';
import { problem, ProblemBody, toContractSummary, validation } from './query';

/**
 * Estado en memoria del modo mock: catálogos, procesos, contratos y lo que el usuario cambia
 * (búsquedas guardadas, runs, alias, mapeos, enriquecimientos). Se pierde al recargar.
 * Los métodos devuelven el valor o un `ProblemBody` con los códigos de error reales.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
export const MAX_SAVED_SEARCHES = 20;
/** Un enriquecimiento pasa a `succeeded` a los 3 s (el cliente consulta cada 5 s). */
export const ENRICHMENT_DURATION_MS = 3000;
/** Un run en cola arranca a los 2 s y termina a los 20 s. */
export const RUN_START_MS = 2000;
export const RUN_DURATION_MS = 20_000;

export type Outcome<T> = { ok: true; value: T } | { ok: false; problem: ProblemBody };

function ok<T>(value: T): Outcome<T> {
  return { ok: true, value };
}

function fail<T>(body: ProblemBody): Outcome<T> {
  return { ok: false, problem: body };
}

let sequence = 0;
function uuid(): string {
  sequence += 1;
  const hex = (sequence + 0x1000).toString(16).padStart(12, '0');
  return `5e1ec7ed-0000-4000-8000-${hex}`;
}

interface EnrichmentJob {
  requestedAt: number;
}

interface QueuedRun {
  run: IngestionRun;
  /** Los runs creados en la sesión avanzan con el reloj; los del fixture son fijos. */
  live: boolean;
}

export class MockDb {
  readonly departments: Department[] = DEPARTMENTS;
  readonly municipalities: Municipality[] = MUNICIPALITIES;
  readonly industries: Industry[];
  readonly processes: ProcessDetail[];
  readonly contracts: ContractDetail[];
  unresolved: UnresolvedLocation[];
  readonly aliases: {
    departmentRaw: string | null;
    municipalityRaw: string;
    divipolaCode: string;
  }[] = [];
  savedSearches: SavedSearch[];
  readonly deliveries = new Map<string, AlertDelivery[]>();
  private readonly runs: QueuedRun[];
  readonly checkpoints: SyncCheckpoint[];
  private readonly enrichmentJobs = new Map<string, EnrichmentJob>();

  constructor(private readonly clock: () => number = Date.now) {
    const now = clock();
    this.industries = INDUSTRIES.map((industry) => ({
      ...industry,
      prefixes: [...industry.prefixes],
    }));
    this.processes = processesFixture(now);
    this.contracts = contractsFixture(this.processes, now);
    for (const process of this.processes) {
      process.contracts = this.contracts
        .filter((c) => c.processSourceId === process.sourceId)
        .map(toContractSummary);
    }
    // El segundo proceso ya trae documentos y cronograma.
    this.processes[1].enrichment = this.succeededEnrichment(this.processes[1], now - DAY_MS);
    this.unresolved = unresolvedLocationsFixture(now);
    this.savedSearches = this.savedSearchesFixture(now);
    this.runs = this.runsFixture(now).map((run) => ({ run, live: false }));
    this.checkpoints = DATASET_KEYS.map((datasetKey, i) => ({
      datasetKey,
      watermark: new Date(now - (4 + i) * 60 * MINUTE_MS).toISOString(),
      backfillCompletedAt: new Date(now - (40 + i) * DAY_MS).toISOString(),
      lastSuccessAt: new Date(now - (4 + i) * 60 * MINUTE_MS).toISOString(),
    }));
  }

  // ── Procesos y contratos ────────────────────────────────────────────────────────────

  process(source: string, sourceId: string): Outcome<ProcessDetail> {
    const found = this.processes.find((p) => p.source === source && p.sourceId === sourceId);
    if (!found) {
      return fail(
        problem(
          404,
          'Procurement.ProcessNotFound',
          'No process with that source and id has been ingested.',
        ),
      );
    }
    const job = this.enrichmentJobs.get(sourceId);
    return ok(job ? { ...found, enrichment: this.enrichmentFor(found, job) } : found);
  }

  contract(source: string, sourceId: string): Outcome<ContractDetail> {
    const found = this.contracts.find((c) => c.source === source && c.sourceId === sourceId);
    return found
      ? ok(found)
      : fail(
          problem(
            404,
            'Procurement.ContractNotFound',
            'No contract with that source and id has been ingested.',
          ),
        );
  }

  // ── Enriquecimiento (SPEC 07) ───────────────────────────────────────────────────────

  getEnrichment(sourceId: string): Outcome<Enrichment> {
    const process = this.processes.find((p) => p.source === 'secop2' && p.sourceId === sourceId);
    if (!process) return fail(this.enrichmentNotFound());
    const job = this.enrichmentJobs.get(sourceId);
    if (job) return ok(this.enrichmentFor(process, job));
    if (process.enrichment) return ok(process.enrichment);
    return fail(this.enrichmentNotFound());
  }

  requestEnrichment(sourceId: string): Outcome<Enrichment> {
    const process = this.processes.find((p) => p.source === 'secop2' && p.sourceId === sourceId);
    if (!process) return fail(this.enrichmentNotFound());
    if (sourceId === BLOCKED_PROCESS_ID) {
      return fail(
        problem(503, 'Scraping.HostBlocked', 'The SECOP portal refused the scraper.', {
          blockedUntil: new Date(this.clock() + 2 * 60 * MINUTE_MS).toISOString(),
        }),
      );
    }
    const current = this.enrichmentJobs.get(sourceId);
    if (current && this.clock() - current.requestedAt < ENRICHMENT_DURATION_MS) {
      return fail(
        problem(
          409,
          'Scraping.AlreadyRunning',
          'The enrichment of this process is already running.',
        ),
      );
    }
    const job = { requestedAt: this.clock() };
    this.enrichmentJobs.set(sourceId, job);
    return ok(this.enrichmentFor(process, job));
  }

  scrapingStatus(): ScrapingStatus {
    return {
      enabled: true,
      blockedUntil: null,
      reason: null,
      last24h: { succeeded: 42, failed: 3, blocked: 1 },
    };
  }

  private enrichmentNotFound(): ProblemBody {
    return problem(404, 'Scraping.NotFound', 'The process has no enrichment.');
  }

  private enrichmentFor(process: ProcessDetail, job: EnrichmentJob): Enrichment {
    if (this.clock() - job.requestedAt < ENRICHMENT_DURATION_MS) {
      return {
        status: 'running',
        completedAt: null,
        offersDeadlineAt: null,
        documents: [],
        schedule: [],
        error: null,
      };
    }
    return this.succeededEnrichment(process, job.requestedAt + ENRICHMENT_DURATION_MS);
  }

  private succeededEnrichment(process: ProcessDetail, completedAt: number): Enrichment {
    const published = Date.parse(process.publishedAt ?? '') || completedAt;
    const deadline = process.offersDeadlineAt;
    return {
      status: 'succeeded',
      completedAt: new Date(completedAt).toISOString(),
      offersDeadlineAt: deadline,
      documents: [
        {
          name: 'Pliego de condiciones definitivo.pdf',
          url: `${process.url ?? ''}#pliego`,
          publishedAt: new Date(published).toISOString(),
        },
        {
          name: 'Anexo técnico.pdf',
          url: `${process.url ?? ''}#anexo`,
          publishedAt: new Date(published).toISOString(),
        },
        {
          name: 'Estudios previos.pdf',
          url: `${process.url ?? ''}#estudios`,
          publishedAt: new Date(published - DAY_MS).toISOString(),
        },
      ],
      schedule: [
        {
          milestone: 'Publicación del aviso de convocatoria',
          date: new Date(published).toISOString(),
        },
        {
          milestone: 'Plazo para presentar observaciones',
          date: new Date(published + 3 * DAY_MS).toISOString(),
        },
        { milestone: 'Presentación de ofertas', date: deadline },
        {
          milestone: 'Publicación del informe de evaluación',
          date: deadline ? new Date(Date.parse(deadline) + 5 * DAY_MS).toISOString() : null,
        },
      ],
      error: null,
    };
  }

  // ── Catálogos (SPEC 01) ─────────────────────────────────────────────────────────────

  createAlias(
    body: Partial<{ departmentRaw: string | null; municipalityRaw: string; divipolaCode: string }>,
  ): Outcome<{ id: string }> {
    const errors = [];
    if (!body.municipalityRaw?.trim())
      errors.push({
        code: 'MunicipalityRaw',
        description: 'The municipality spelling is required.',
      });
    if (!/^\d{5}$/.test(body.divipolaCode ?? ''))
      errors.push({ code: 'DivipolaCode', description: 'The DIVIPOLA code has 5 digits.' });
    if (errors.length > 0) return fail(validation(errors));
    if (!this.municipalities.some((m) => m.divipolaCode === body.divipolaCode)) {
      return fail(
        problem(404, 'Catalog.MunicipalityNotFound', 'No municipality has that DIVIPOLA code.'),
      );
    }
    const key = (raw: string | null | undefined) => (raw ?? '').trim().toUpperCase();
    if (
      this.aliases.some(
        (a) =>
          key(a.municipalityRaw) === key(body.municipalityRaw) &&
          key(a.departmentRaw) === key(body.departmentRaw),
      )
    ) {
      return fail(problem(409, 'Catalog.AliasExists', 'That spelling is already mapped.'));
    }
    this.aliases.push({
      departmentRaw: body.departmentRaw ?? null,
      municipalityRaw: body.municipalityRaw!,
      divipolaCode: body.divipolaCode!,
    });
    this.unresolved = this.unresolved.filter(
      (u) =>
        !(
          key(u.municipalityRaw) === key(body.municipalityRaw) &&
          (!body.departmentRaw || key(u.departmentRaw) === key(body.departmentRaw))
        ),
    );
    return ok({ id: uuid() });
  }

  upsertMapping(prefix: string, industryId: string | undefined): Outcome<void> {
    const errors = [];
    if (!/^\d{2}(\d{2}){0,3}$/.test(prefix))
      errors.push({ code: 'Prefix', description: 'The prefix must have 2, 4, 6 or 8 digits.' });
    if (!this.industries.some((i) => i.id === industryId))
      errors.push({ code: 'IndustryId', description: 'The industry does not exist.' });
    if (errors.length > 0) return fail(validation(errors));
    for (const industry of this.industries)
      industry.prefixes = industry.prefixes.filter((p) => p !== prefix);
    this.industries.find((i) => i.id === industryId)!.prefixes.push(prefix);
    return ok(undefined);
  }

  deleteMapping(prefix: string): Outcome<void> {
    if (!/^\d{2}(\d{2}){0,3}$/.test(prefix)) {
      return fail(
        validation([{ code: 'Prefix', description: 'The prefix must have 2, 4, 6 or 8 digits.' }]),
      );
    }
    const owner = this.industries.find((i) => i.prefixes.includes(prefix));
    if (!owner)
      return fail(problem(404, 'Catalog.MappingNotFound', 'No industry mapping has that prefix.'));
    owner.prefixes = owner.prefixes.filter((p) => p !== prefix);
    return ok(undefined);
  }

  // ── Búsquedas guardadas (SPEC 08) ───────────────────────────────────────────────────

  savedSearch(id: string): Outcome<SavedSearch> {
    const found = this.savedSearches.find((s) => s.id === id);
    return found ? ok(found) : fail(this.savedSearchNotFound());
  }

  createSavedSearch(body: Partial<CreateSavedSearchRequest>): Outcome<SavedSearch> {
    const invalid = this.validateSavedSearch(body, true);
    if (invalid) return fail(invalid);
    if (this.savedSearches.length >= MAX_SAVED_SEARCHES) {
      return fail(
        problem(
          422,
          'SavedSearch.LimitReached',
          `A user can keep at most ${MAX_SAVED_SEARCHES} saved searches.`,
        ),
      );
    }
    const taken = this.nameTaken(body.name!, null);
    if (taken) return fail(taken);
    const search: SavedSearch = {
      id: uuid(),
      name: body.name!.trim(),
      kind: body.kind!,
      filters: body.filters ?? {},
      frequency: body.frequency!,
      isPaused: false,
      lastAlertAt: null,
      createdAt: new Date(this.clock()).toISOString(),
      newSinceLastAlert: 0,
    };
    this.savedSearches = [...this.savedSearches, search];
    this.deliveries.set(search.id, []);
    return ok(search);
  }

  updateSavedSearch(id: string, body: Partial<UpdateSavedSearchRequest>): Outcome<SavedSearch> {
    const current = this.savedSearches.find((s) => s.id === id);
    if (!current) return fail(this.savedSearchNotFound());
    const invalid = this.validateSavedSearch(body, false);
    if (invalid) return fail(invalid);
    const taken = this.nameTaken(body.name!, id);
    if (taken) return fail(taken);
    const updated: SavedSearch = {
      ...current,
      name: body.name!.trim(),
      filters: body.filters ?? {},
      frequency: body.frequency!,
    };
    this.savedSearches = this.savedSearches.map((s) => (s.id === id ? updated : s));
    return ok(updated);
  }

  deleteSavedSearch(id: string): Outcome<void> {
    if (!this.savedSearches.some((s) => s.id === id)) return fail(this.savedSearchNotFound());
    this.savedSearches = this.savedSearches.filter((s) => s.id !== id);
    this.deliveries.delete(id);
    return ok(undefined);
  }

  setPaused(id: string, isPaused: boolean): Outcome<void> {
    if (!this.savedSearches.some((s) => s.id === id)) return fail(this.savedSearchNotFound());
    this.savedSearches = this.savedSearches.map((s) => (s.id === id ? { ...s, isPaused } : s));
    return ok(undefined);
  }

  private validateSavedSearch(
    body: Partial<CreateSavedSearchRequest>,
    creating: boolean,
  ): ProblemBody | null {
    const errors = [];
    const name = body.name?.trim() ?? '';
    if (name.length < 1 || name.length > 100)
      errors.push({
        code: 'SavedSearch.InvalidName',
        description: 'The name must have between 1 and 100 characters.',
      });
    if (creating && !['processes', 'contracts'].includes(body.kind ?? ''))
      errors.push({ code: 'Kind', description: 'The kind must be processes or contracts.' });
    if (!['none', 'daily', 'weekly'].includes(body.frequency ?? ''))
      errors.push({
        code: 'Frequency',
        description: 'The frequency must be none, daily or weekly.',
      });
    return errors.length > 0 ? validation(errors) : null;
  }

  /** Además de los nombres repetidos, cualquier nombre con "repetida" choca (para e2e). */
  private nameTaken(name: string, exceptId: string | null): ProblemBody | null {
    const wanted = name.trim().toLowerCase();
    const clash =
      wanted.includes('repetida') ||
      this.savedSearches.some((s) => s.id !== exceptId && s.name.toLowerCase() === wanted);
    return clash
      ? problem(
          409,
          'SavedSearch.NameTaken',
          'Another saved search of the current user already has that name.',
        )
      : null;
  }

  private savedSearchNotFound(): ProblemBody {
    return problem(
      404,
      'SavedSearch.NotFound',
      'No saved search with that id belongs to the current user.',
    );
  }

  private savedSearchesFixture(now: number): SavedSearch[] {
    const searches: [
      string,
      SavedSearch['kind'],
      SavedSearchFilter,
      SavedSearch['frequency'],
      boolean,
      number,
    ][] = [
      [
        'Software en Cajicá y Chía',
        'processes',
        {
          industry: ['software'],
          municipality: ['25126', '25175'],
          onlyActive: true,
          competitiveOnly: true,
        },
        'daily',
        false,
        3,
      ],
      [
        'Obra civil Cundinamarca',
        'processes',
        { industry: ['obra-civil'], department: ['25'], onlyActive: true },
        'weekly',
        true,
        0,
      ],
      [
        'Contratos de papelería en Bogotá',
        'contracts',
        { industry: ['papeleria'], municipality: ['11001'] },
        'none',
        false,
        0,
      ],
    ];
    const result = searches.map(([name, kind, filters, frequency, isPaused, fresh], i) => ({
      id: `0b5e55ed-0000-4000-8000-00000000000${i + 1}`,
      name,
      kind,
      filters,
      frequency,
      isPaused,
      lastAlertAt: frequency === 'none' ? null : new Date(now - (i + 1) * DAY_MS).toISOString(),
      createdAt: new Date(now - (30 + i * 7) * DAY_MS).toISOString(),
      newSinceLastAlert: fresh,
    }));
    for (const search of result) {
      const deliveries: AlertDelivery[] =
        search.frequency === 'none'
          ? []
          : Array.from({ length: 6 }, (_, k) => {
              const created = now - (k + 1) * (search.frequency === 'daily' ? 1 : 7) * DAY_MS;
              const failed = k === 3;
              return {
                id: `de11e7ed-0000-4000-8000-${String(k).padStart(4, '0')}${search.id.slice(-8)}`,
                windowFrom: new Date(
                  created - (search.frequency === 'daily' ? DAY_MS : 7 * DAY_MS),
                ).toISOString(),
                windowTo: new Date(created).toISOString(),
                matches: 6 - k,
                included: Math.min(6 - k, 5),
                status: failed ? 'failed' : 'sent',
                error: failed ? 'SMTP 451: temporary failure' : null,
                createdAt: new Date(created).toISOString(),
                sentAt: failed ? null : new Date(created + 2 * MINUTE_MS).toISOString(),
              };
            });
      this.deliveries.set(search.id, deliveries);
    }
    return result;
  }

  // ── Ingesta (SPEC 02/04) ────────────────────────────────────────────────────────────

  listRuns(): IngestionRun[] {
    return this.runs
      .map((entry) => this.progress(entry))
      .sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
  }

  getRun(id: string): Outcome<IngestionRun> {
    const entry = this.runs.find((r) => r.run.id === id);
    return entry
      ? ok(this.progress(entry))
      : fail(problem(404, 'Ingestion.RunNotFound', 'No ingestion run has that id.'));
  }

  queueRun(body: Partial<QueueIngestionRunRequest>): Outcome<{ runId: string }> {
    const errors = [];
    if (!DATASET_KEYS.includes(body.datasetKey as DatasetKey))
      errors.push({ code: 'DatasetKey', description: 'Unknown dataset.' });
    if (!INGESTION_MODES.includes(body.mode as IngestionMode))
      errors.push({ code: 'Mode', description: 'Unknown mode.' });
    if (body.mode === 'refresh-open' && body.datasetKey !== 'secop2-processes') {
      errors.push({ code: 'Mode', description: 'refresh-open only applies to secop2-processes.' });
    }
    if (body.from && body.to && body.from > body.to)
      errors.push({ code: 'To', description: 'to must be on or after from.' });
    if (errors.length > 0) return fail(validation(errors));
    const active = this.listRuns().some(
      (r) => r.datasetKey === body.datasetKey && (r.status === 'queued' || r.status === 'running'),
    );
    if (active)
      return fail(
        problem(
          409,
          'Ingestion.RunInProgress',
          'A run of that dataset is already queued or running.',
        ),
      );
    const run: IngestionRun = {
      id: uuid(),
      datasetKey: body.datasetKey!,
      mode: body.mode!,
      status: 'queued',
      windowFrom: body.from ? `${body.from}T00:00:00Z` : null,
      windowTo: body.to ? `${body.to}T23:59:59Z` : null,
      pages: 0,
      rowsRead: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsUnchanged: 0,
      rowsRejected: 0,
      error: null,
      requestedBy: 'demo@secopradar.test',
      queuedAt: new Date(this.clock()).toISOString(),
      startedAt: null,
      finishedAt: null,
    };
    this.runs.push({ run, live: true });
    return ok({ runId: run.id });
  }

  private progress({ run, live }: QueuedRun): IngestionRun {
    if (!live) return run;
    const queued = Date.parse(run.queuedAt);
    const elapsed = this.clock() - queued;
    if (elapsed < RUN_START_MS) return run;
    const share = Math.min(1, (elapsed - RUN_START_MS) / RUN_DURATION_MS);
    const rowsRead = Math.round(share * 12_000);
    return {
      ...run,
      status: share >= 1 ? 'succeeded' : 'running',
      startedAt: new Date(queued + RUN_START_MS).toISOString(),
      finishedAt:
        share >= 1 ? new Date(queued + RUN_START_MS + RUN_DURATION_MS).toISOString() : null,
      pages: Math.ceil(rowsRead / 1000),
      rowsRead,
      rowsInserted: Math.round(rowsRead * 0.08),
      rowsUpdated: Math.round(rowsRead * 0.21),
      rowsUnchanged: Math.round(rowsRead * 0.7),
      rowsRejected: Math.round(rowsRead * 0.01),
    };
  }

  private runsFixture(now: number): IngestionRun[] {
    const rows: [
      DatasetKey,
      IngestionMode,
      IngestionRun['status'],
      number,
      number,
      string | null,
    ][] = [
      ['secop2-processes', 'incremental', 'succeeded', 4, 6_214, null],
      ['secop2-contracts', 'incremental', 'succeeded', 5, 4_870, null],
      ['secop1-processes', 'incremental', 'succeeded', 6, 1_120, null],
      ['secop2-processes', 'refresh-open', 'succeeded', 16, 2_904, null],
      [
        'secop2-contracts',
        'reconcile',
        'failed',
        28,
        31_500,
        'Socrata respondió 503 Service Unavailable tras 5 reintentos.',
      ],
      ['secop2-processes', 'incremental', 'succeeded', 28, 5_980, null],
      ['secop1-processes', 'backfill', 'cancelled', 72, 88_000, null],
      ['secop2-processes', 'backfill', 'succeeded', 960, 1_480_220, null],
    ];
    return rows.map(([datasetKey, mode, status, hoursAgo, rowsRead, error], i) => {
      const queuedAt = now - hoursAgo * 60 * MINUTE_MS;
      return {
        id: `a11ce000-0000-4000-8000-00000000000${i}`,
        datasetKey,
        mode,
        status,
        windowFrom:
          mode === 'backfill' ? '2024-01-01T00:00:00Z' : new Date(queuedAt - DAY_MS).toISOString(),
        windowTo: new Date(queuedAt).toISOString(),
        pages: Math.ceil(rowsRead / 1000),
        rowsRead,
        rowsInserted: Math.round(rowsRead * 0.1),
        rowsUpdated: Math.round(rowsRead * 0.2),
        rowsUnchanged: Math.round(rowsRead * 0.69),
        rowsRejected: Math.round(rowsRead * 0.01),
        error,
        requestedBy: i % 3 === 0 ? 'scheduler' : 'admin@secopradar.test',
        queuedAt: new Date(queuedAt).toISOString(),
        startedAt: new Date(queuedAt + 5000).toISOString(),
        finishedAt: new Date(queuedAt + 25 * MINUTE_MS).toISOString(),
      };
    });
  }
}
