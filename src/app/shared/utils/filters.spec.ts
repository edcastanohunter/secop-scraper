import { convertToParamMap } from '@angular/router';

import {
  bogotaDate,
  countActiveFilters,
  defaultDateRange,
  filtersToQueryParams,
  fromSavedSearchFilter,
  isValidUnspscPrefix,
  maxPageFor,
  parseFilters,
  savedFilterToQueryParams,
  toApiParams,
  toSavedSearchFilter,
  withDefaults,
} from './filters';

const PROCESS_DEFAULTS = { onlyActive: true, competitiveOnly: true };

describe('parseFilters', () => {
  it('sin parámetros devuelve los valores por defecto de la pantalla', () => {
    const filters = parseFilters(convertToParamMap({}), PROCESS_DEFAULTS);

    expect(filters).toEqual(withDefaults(PROCESS_DEFAULTS));
    expect(filters.onlyActive).toBe(true);
    expect(filters.page).toBe(1);
    expect(filters.pageSize).toBe(20);
  });

  it('lee filtros repetibles, booleanos, números y fechas', () => {
    const filters = parseFilters(
      convertToParamMap({
        q: '  papelería ',
        industry: ['software', 'consultoria', 'software'],
        municipality: '25126',
        source: 'secop2',
        minAmount: '1000000',
        dateFrom: '2026-01-01',
        onlyActive: 'false',
        sort: 'amount_desc',
        page: '3',
        pageSize: '50',
      }),
      PROCESS_DEFAULTS,
    );

    expect(filters).toMatchObject({
      q: 'papelería',
      industry: ['software', 'consultoria'],
      municipality: ['25126'],
      source: 'secop2',
      minAmount: 1_000_000,
      dateFrom: '2026-01-01',
      onlyActive: false,
      sort: 'amount_desc',
      page: 3,
      pageSize: 50,
    });
  });

  it('descarta valores que la API rechazaría', () => {
    const filters = parseFilters(
      convertToParamMap({
        source: 'secop3',
        sort: 'random',
        page: '-2',
        pageSize: '33',
        minAmount: 'mucho',
        dateTo: '05/10/2026',
      }),
    );

    expect(filters).toMatchObject({
      source: null,
      sort: null,
      page: 1,
      pageSize: 20,
      minAmount: null,
      dateTo: '',
    });
  });
});

describe('filtersToQueryParams', () => {
  it('omite (null) lo que coincide con el defecto y deja la URL corta', () => {
    const filters = {
      ...withDefaults(PROCESS_DEFAULTS),
      industry: ['software'],
      municipality: ['25126'],
    };
    const params = filtersToQueryParams(filters, PROCESS_DEFAULTS);

    expect(params['industry']).toEqual(['software']);
    expect(params['municipality']).toEqual(['25126']);
    expect(params['onlyActive']).toBeNull();
    expect(params['competitiveOnly']).toBeNull();
    expect(params['page']).toBeNull();
    expect(params['q']).toBeNull();
  });

  it('escribe los booleanos que difieren del defecto de la pantalla', () => {
    const filters = { ...withDefaults(PROCESS_DEFAULTS), onlyActive: false };
    expect(filtersToQueryParams(filters, PROCESS_DEFAULTS)['onlyActive']).toBe('false');
  });

  it('ida y vuelta: parsear lo serializado reproduce los mismos filtros', () => {
    const original = {
      ...withDefaults(PROCESS_DEFAULTS),
      q: '"obra civil" -interventoría',
      department: ['25', '11'],
      maxAmount: 500_000_000,
      dateTo: '2026-09-30',
      sort: 'deadline_asc' as const,
      page: 2,
    };
    const params = filtersToQueryParams(original, PROCESS_DEFAULTS);
    const present = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== null));

    expect(parseFilters(convertToParamMap(present), PROCESS_DEFAULTS)).toEqual(original);
  });
});

describe('toApiParams', () => {
  const filters = {
    ...withDefaults(PROCESS_DEFAULTS),
    q: 'software',
    industry: ['software'],
    municipality: ['25126'],
    entity: 'Alcaldía',
    minAmount: 10,
    sort: 'date_asc' as const,
  };

  it('procesos: industria Software + Cajicá produce la URL del criterio de aceptación', () => {
    const params = toApiParams(
      { ...withDefaults(PROCESS_DEFAULTS), industry: ['software'], municipality: ['25126'] },
      'processes',
    );

    expect(params).toEqual({
      industry: ['software'],
      municipality: ['25126'],
      onlyActive: 'true',
      competitiveOnly: 'true',
      page: '1',
      pageSize: '20',
    });
  });

  it('contratos: sin onlyActive ni competitiveOnly (el endpoint no los acepta)', () => {
    const params = toApiParams(filters, 'contracts');

    expect(params).not.toHaveProperty('onlyActive');
    expect(params).not.toHaveProperty('competitiveOnly');
    expect(params['q']).toBe('software');
  });

  it('stats: sin texto, entidad, montos, orden ni paginación, y con kind', () => {
    const params = toApiParams(filters, 'stats', 'processes');

    expect(Object.keys(params).sort()).toEqual(
      ['competitiveOnly', 'industry', 'kind', 'municipality', 'onlyActive'].sort(),
    );
    expect(params['kind']).toBe('processes');
  });

  it('stats de contratos no manda los interruptores de procesos', () => {
    const params = toApiParams(filters, 'stats', 'contracts');

    expect(params).not.toHaveProperty('onlyActive');
    expect(params['kind']).toBe('contracts');
  });

  it('exportar ignora la paginación', () => {
    const params = toApiParams(filters, 'export-processes');

    expect(params).not.toHaveProperty('page');
    expect(params).not.toHaveProperty('pageSize');
    expect(params['sort']).toBe('date_asc');
  });
});

describe('búsquedas guardadas', () => {
  it('toSavedSearchFilter usa null para lo vacío y omite interruptores en contratos', () => {
    const filters = { ...withDefaults(), industry: ['papeleria'], onlyActive: true };

    expect(toSavedSearchFilter(filters, 'contracts')).toEqual({
      q: null,
      industry: ['papeleria'],
      department: null,
      municipality: null,
      entity: null,
      source: null,
      status: null,
      onlyActive: null,
      competitiveOnly: null,
      modality: null,
      minAmount: null,
      maxAmount: null,
      dateFrom: null,
      dateTo: null,
    });
    expect(toSavedSearchFilter(filters, 'processes').onlyActive).toBe(true);
  });

  it('fromSavedSearchFilter y savedFilterToQueryParams reconstruyen los filtros', () => {
    const saved = {
      industry: ['software'],
      municipality: ['25126', '25175'],
      onlyActive: true,
      q: null,
    };

    expect(fromSavedSearchFilter(saved)).toMatchObject({
      industry: ['software'],
      municipality: ['25126', '25175'],
      onlyActive: true,
      q: '',
    });
    expect(savedFilterToQueryParams(saved)).toEqual({
      industry: ['software'],
      municipality: ['25126', '25175'],
      onlyActive: 'true',
    });
  });
});

describe('utilidades', () => {
  it('countActiveFilters cuenta cada valor y cada interruptor cambiado', () => {
    const filters = {
      ...withDefaults(PROCESS_DEFAULTS),
      industry: ['a', 'b'],
      q: 'x',
      onlyActive: false,
      sort: 'amount_asc' as const,
    };
    expect(countActiveFilters(filters, PROCESS_DEFAULTS)).toBe(4);
  });

  it.each([
    ['43', true],
    ['4323', true],
    ['432315', true],
    ['43231501', true],
    ['4', false],
    ['432', false],
    ['4323150112', false],
    ['43a1', false],
  ])('isValidUnspscPrefix(%s) = %s', (prefix, valid) => {
    expect(isValidUnspscPrefix(prefix)).toBe(valid);
  });

  it('maxPageFor respeta page × pageSize ≤ 10.000', () => {
    expect(maxPageFor(20)).toBe(500);
    expect(maxPageFor(100)).toBe(100);
  });

  it('bogotaDate usa UTC-5', () => {
    expect(bogotaDate(Date.parse('2026-10-05T03:00:00Z'))).toBe('2026-10-04');
    expect(bogotaDate(Date.parse('2026-10-05T06:00:00Z'))).toBe('2026-10-05');
  });

  it('defaultDateRange cubre los últimos 12 meses', () => {
    expect(defaultDateRange(Date.parse('2026-10-05T15:00:00Z'))).toEqual({
      dateFrom: '2025-10-06',
      dateTo: '2026-10-05',
    });
  });
});
