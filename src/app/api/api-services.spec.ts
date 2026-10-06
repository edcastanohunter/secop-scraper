import { HttpParams, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ApplicationRef, Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { apiUrl } from '../core/config/api-url';
import { withDefaults } from '../shared/utils/filters';
import { CatalogService } from './catalog.service';
import { ContractsService } from './contracts.service';
import { EnrichmentService } from './enrichment.service';
import { ExportService } from './export.service';
import { IngestionService } from './ingestion.service';
import { Enrichment } from './models';
import { ProcessesService } from './processes.service';
import { SavedSearchesService } from './saved-searches.service';
import { SearchService } from './search.service';
import { StatsService } from './stats.service';

/**
 * Cada servicio habla con la ruta, el método, los parámetros y el cuerpo que define el
 * OpenAPI (y, para los `Request` colapsados, los DTOs reales del backend).
 */
describe('servicios de la API', () => {
  let controller: HttpTestingController;
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    controller = TestBed.inject(HttpTestingController);
    injector = TestBed.inject(Injector);
  });

  afterEach(() => controller.verify());

  /** Crea el `httpResource` y deja que dispare su petición. */
  function read<T>(create: () => T): T {
    const resource = runInInjectionContext(injector, create);
    TestBed.inject(ApplicationRef).tick();
    return resource;
  }

  function params(req: TestRequest): Record<string, string[]> {
    const p: HttpParams = req.request.params;
    return Object.fromEntries(p.keys().map((k) => [k, p.getAll(k) ?? []]));
  }

  function expectGet(path: string): TestRequest {
    return controller.expectOne((r) => r.method === 'GET' && r.url === apiUrl(path));
  }

  describe('lecturas', () => {
    it('GET /processes con los filtros como query (repetibles con la misma clave)', () => {
      const filters = {
        ...withDefaults({ onlyActive: true }),
        industry: ['software'],
        municipality: ['25126', '25175'],
      };
      read(() => TestBed.inject(ProcessesService).list(() => filters));

      const req = expectGet('/processes');
      expect(params(req)).toEqual({
        industry: ['software'],
        municipality: ['25126', '25175'],
        onlyActive: ['true'],
        competitiveOnly: ['true'],
        page: ['1'],
        pageSize: ['20'],
      });
      req.flush({ items: [] });
    });

    it('no pide nada mientras los parámetros sean undefined', () => {
      read(() => TestBed.inject(ProcessesService).list(() => undefined));
      controller.expectNone(apiUrl('/processes'));
    });

    it('GET /processes/{source}/{sourceId} y /contracts/{source}/{sourceId} codifican el id', () => {
      read(() =>
        TestBed.inject(ProcessesService).detail(() => ({ source: 'secop1', sourceId: '26-12/1' })),
      );
      read(() =>
        TestBed.inject(ContractsService).detail(() => ({
          source: 'secop2',
          sourceId: 'CO1.PCCNTR.1',
        })),
      );

      expectGet('/processes/secop1/26-12%2F1').flush({});
      expectGet('/contracts/secop2/CO1.PCCNTR.1').flush({});
    });

    it('GET /contracts no manda onlyActive ni competitiveOnly', () => {
      read(() => TestBed.inject(ContractsService).list(() => withDefaults()));
      const req = expectGet('/contracts');
      expect(params(req)).toEqual({ page: ['1'], pageSize: ['20'] });
      req.flush({ items: [] });
    });

    it('GET /search', () => {
      read(() => TestBed.inject(SearchService).search(() => ({ ...withDefaults(), q: 'aseo' })));
      const req = expectGet('/search');
      expect(params(req)['q']).toEqual(['aseo']);
      req.flush({ items: [] });
    });

    it('estadísticas: kind, interval, level y limit', () => {
      const stats = TestBed.inject(StatsService);
      const filters = {
        ...withDefaults(),
        dateFrom: '2025-10-06',
        dateTo: '2026-10-05',
        q: 'ignorado',
      };
      read(() => stats.summary(() => ({ filters, kind: 'contracts' })));
      read(() => stats.timeSeries(() => ({ filters, kind: 'processes', interval: 'week' })));
      read(() => stats.byLocation(() => ({ filters, kind: 'processes', level: 'municipality' })));
      read(() => stats.topEntities(() => ({ filters, kind: 'processes', limit: 10 })));
      read(() => stats.byIndustry(() => ({ filters, kind: 'processes' })));
      read(() => stats.facets(() => ({ filters, kind: 'processes' })));

      const summary = expectGet('/stats/summary');
      expect(params(summary)).toEqual({
        dateFrom: ['2025-10-06'],
        dateTo: ['2026-10-05'],
        kind: ['contracts'],
      });
      expect(params(expectGet('/stats/timeseries'))['interval']).toEqual(['week']);
      expect(params(expectGet('/stats/by-location'))['level']).toEqual(['municipality']);
      expect(params(expectGet('/stats/top-entities'))['limit']).toEqual(['10']);
      expect(params(expectGet('/stats/by-industry'))).not.toHaveProperty('q');
      expectGet('/stats/facets');
      controller.match(() => true).forEach((r) => r.flush({}));
      summary.flush({});
    });

    it('catálogos: departamentos, industrias y municipios con q y departmentCode', () => {
      const catalog = TestBed.inject(CatalogService);
      read(() => catalog.departments());
      read(() => catalog.industries());
      read(() => catalog.municipalities(() => ({ q: 'caj', departmentCode: '25' })));
      read(() => catalog.unresolvedLocations(() => ({ page: 2, pageSize: 20 })));

      expectGet('/catalog/departments').flush([]);
      expectGet('/catalog/industries').flush([]);
      const towns = expectGet('/catalog/municipalities');
      expect(params(towns)).toEqual({ q: ['caj'], departmentCode: ['25'] });
      towns.flush([]);
      expect(params(expectGet('/catalog/unresolved-locations'))).toEqual({
        page: ['2'],
        pageSize: ['20'],
      });
      controller.match(() => true).forEach((r) => r.flush({ items: [] }));
    });

    it('municipalitiesOf junta los municipios de varios departamentos', async () => {
      const result = firstValueFrom(TestBed.inject(CatalogService).municipalitiesOf(['25', '11']));
      const reqs = controller.match((r) => r.url === apiUrl('/catalog/municipalities'));
      expect(reqs.map((r) => r.request.params.get('departmentCode'))).toEqual(['25', '11']);
      reqs[0].flush([{ divipolaCode: '25126' }]);
      reqs[1].flush([{ divipolaCode: '11001' }]);
      expect((await result).map((m) => m.divipolaCode)).toEqual(['25126', '11001']);
    });

    it('búsquedas guardadas: resultados con orden e historial paginado', () => {
      const saved = TestBed.inject(SavedSearchesService);
      read(() => saved.results(() => ({ id: 'abc', page: 2, pageSize: 50, sort: 'amount_desc' })));
      read(() => saved.deliveries(() => ({ id: 'abc', page: 1, pageSize: 20 })));

      expect(params(expectGet('/saved-searches/abc/results'))).toEqual({
        page: ['2'],
        pageSize: ['50'],
        sort: ['amount_desc'],
      });
      expectGet('/saved-searches/abc/deliveries');
      controller.match(() => true).forEach((r) => r.flush({ items: [] }));
    });

    it('ingesta: runs con filtros opcionales y checkpoints', () => {
      const ingestion = TestBed.inject(IngestionService);
      read(() =>
        ingestion.runs(() => ({
          datasetKey: 'secop2-processes',
          status: null,
          page: 1,
          pageSize: 20,
        })),
      );
      read(() => ingestion.checkpoints());

      expect(params(expectGet('/ingestion/runs'))).toEqual({
        page: ['1'],
        pageSize: ['20'],
        datasetKey: ['secop2-processes'],
      });
      expectGet('/ingestion/checkpoints');
      controller.match(() => true).forEach((r) => r.flush([]));
    });
  });

  describe('escrituras (cuerpos reales, no el `Request` colapsado del OpenAPI)', () => {
    it('POST /saved-searches { name, kind, filters, frequency }', () => {
      const body = {
        name: 'Software Cajicá',
        kind: 'processes' as const,
        filters: { industry: ['software'] },
        frequency: 'daily' as const,
      };
      TestBed.inject(SavedSearchesService).create(body).subscribe();

      const req = controller.expectOne(apiUrl('/saved-searches'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({});
    });

    it('PUT /saved-searches/{id} sin kind; pausar, reanudar y borrar', () => {
      const saved = TestBed.inject(SavedSearchesService);
      saved.update('abc', { name: 'n', filters: null, frequency: 'none' }).subscribe();
      saved.pause('abc').subscribe();
      saved.resume('abc').subscribe();
      saved.remove('abc').subscribe();

      const put = controller.expectOne((r) => r.method === 'PUT');
      expect(put.request.url).toBe(apiUrl('/saved-searches/abc'));
      expect(put.request.body).toEqual({ name: 'n', filters: null, frequency: 'none' });
      controller.expectOne((r) => r.method === 'POST' && r.url.endsWith('/abc/pause'));
      controller.expectOne((r) => r.method === 'POST' && r.url.endsWith('/abc/resume'));
      controller.expectOne((r) => r.method === 'DELETE' && r.url === apiUrl('/saved-searches/abc'));
      controller.match(() => true).forEach((r) => r.flush(null));
      put.flush({});
    });

    it('POST /ingestion/runs { datasetKey, mode, from, to }', () => {
      const body = {
        datasetKey: 'secop2-processes' as const,
        mode: 'refresh-open' as const,
        from: null,
        to: null,
      };
      TestBed.inject(IngestionService).queue(body).subscribe();

      const req = controller.expectOne(apiUrl('/ingestion/runs'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ runId: '1' });
    });

    it('catálogo: alias, mapeos UNSPSC y recarga DIVIPOLA', () => {
      const catalog = TestBed.inject(CatalogService);
      catalog
        .createLocationAlias({
          departmentRaw: 'CUNDINAMARCA',
          municipalityRaw: 'CAJICA - CUND.',
          divipolaCode: '25126',
        })
        .subscribe();
      catalog.upsertIndustryMapping('4323', { industryId: 'software' }).subscribe();
      catalog.deleteIndustryMapping('4323').subscribe();
      catalog.refreshDivipola().subscribe();

      const alias = controller.expectOne(apiUrl('/catalog/location-aliases'));
      expect(alias.request.body).toEqual({
        departmentRaw: 'CUNDINAMARCA',
        municipalityRaw: 'CAJICA - CUND.',
        divipolaCode: '25126',
      });
      const put = controller.expectOne((r) => r.method === 'PUT');
      expect(put.request.url).toBe(apiUrl('/catalog/industry-mappings/4323'));
      expect(put.request.body).toEqual({ industryId: 'software' });
      controller.expectOne(
        (r) => r.method === 'DELETE' && r.url === apiUrl('/catalog/industry-mappings/4323'),
      );
      controller.expectOne(
        (r) => r.method === 'POST' && r.url === apiUrl('/catalog/divipola/refresh'),
      );
      controller.match(() => true).forEach((r) => r.flush(null));
      alias.flush({});
      put.flush(null);
    });
  });

  describe('exportar', () => {
    it('pide un blob sin paginación y toma el nombre de Content-Disposition', async () => {
      const file = firstValueFrom(
        TestBed.inject(ExportService).csv('contracts', { ...withDefaults(), page: 3, q: 'aseo' }),
      );
      const req = controller.expectOne((r) => r.url === apiUrl('/contracts/export'));
      expect(req.request.responseType).toBe('blob');
      expect(params(req)).toEqual({ q: ['aseo'] });
      req.flush(new Blob(['a;b']), {
        headers: { 'Content-Disposition': 'attachment; filename="contracts-2026-10-05.csv"' },
      });

      expect((await file).filename).toBe('contracts-2026-10-05.csv');
    });

    it('sin Content-Disposition usa un nombre en español', async () => {
      const file = firstValueFrom(TestBed.inject(ExportService).csv('processes', withDefaults()));
      controller.expectOne((r) => r.url === apiUrl('/processes/export')).flush(new Blob([]));
      expect((await file).filename).toBe('licitaciones.csv');
    });
  });

  describe('enriquecimiento', () => {
    const running: Enrichment = {
      status: 'running',
      completedAt: null,
      offersDeadlineAt: null,
      documents: [],
      schedule: [],
      error: null,
    };
    const done: Enrichment = {
      ...running,
      status: 'succeeded',
      completedAt: '2026-10-05T15:00:00Z',
    };

    afterEach(() => vi.useRealTimers());

    it('POST encola el scraping en la ruta de SECOP II', () => {
      TestBed.inject(EnrichmentService).request('CO1.REQ.1').subscribe();
      const req = controller.expectOne(apiUrl('/processes/secop2/CO1.REQ.1/enrichment'));
      expect(req.request.method).toBe('POST');
      req.flush(running);
    });

    it('poll consulta cada 5 s y se detiene en el primer estado final', () => {
      vi.useFakeTimers();
      const seen: string[] = [];
      let completed = false;
      TestBed.inject(EnrichmentService)
        .poll('CO1.REQ.1')
        .subscribe({ next: (e) => seen.push(e.status), complete: () => (completed = true) });

      const url = apiUrl('/processes/secop2/CO1.REQ.1/enrichment');
      vi.advanceTimersByTime(4999);
      controller.expectNone(url);
      vi.advanceTimersByTime(1);
      controller.expectOne(url).flush(running);
      vi.advanceTimersByTime(5000);
      controller.expectOne(url).flush(done);
      vi.advanceTimersByTime(5000);
      controller.expectNone(url);

      expect(seen).toEqual(['running', 'succeeded']);
      expect(completed).toBe(true);
    });
  });
});
