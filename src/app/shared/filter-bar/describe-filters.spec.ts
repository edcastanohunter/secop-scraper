import { withDefaults } from '../utils/filters';
import { describeFilters, FilterNames, removeChip, summarizeFilters } from './describe-filters';
import { maskCop, unmaskCop } from './amount-input';

const names: FilterNames = {
  industry: (id) => ({ software: 'Desarrollo de Software', papeleria: 'Papelería' })[id] ?? id,
  department: (code) => ({ '25': 'Cundinamarca' })[code] ?? code,
  municipality: (code) => ({ '25126': 'Cajicá', '25175': 'Chía' })[code] ?? code,
};

const PROCESS_DEFAULTS = { onlyActive: true, competitiveOnly: true };

describe('describeFilters', () => {
  it('genera un chip por valor y omite los valores por defecto', () => {
    const filters = {
      ...withDefaults(PROCESS_DEFAULTS),
      q: 'aseo',
      industry: ['software'],
      municipality: ['25126', '25175'],
      minAmount: 5_000_000,
    };

    expect(describeFilters(filters, names, PROCESS_DEFAULTS).map((c) => c.label)).toEqual([
      '“aseo”',
      'Desarrollo de Software',
      'Cajicá',
      'Chía',
      'Desde $ 5.000.000',
    ]);
  });

  it('muestra el interruptor que se apartó del defecto', () => {
    const filters = { ...withDefaults(PROCESS_DEFAULTS), onlyActive: false };
    expect(describeFilters(filters, names, PROCESS_DEFAULTS)).toEqual([
      { key: 'onlyActive', label: 'Incluye no vigentes' },
    ]);
  });
});

describe('removeChip', () => {
  it('quita un valor de un filtro múltiple', () => {
    const filters = { ...withDefaults(), municipality: ['25126', '25175'] };
    expect(removeChip(filters, { key: 'municipality', value: '25126', label: 'Cajicá' })).toEqual({
      municipality: ['25175'],
    });
  });

  it('devuelve un filtro simple a su valor por defecto', () => {
    const filters = { ...withDefaults(PROCESS_DEFAULTS), onlyActive: false };
    expect(removeChip(filters, { key: 'onlyActive', label: '' }, PROCESS_DEFAULTS)).toEqual({
      onlyActive: true,
    });
  });
});

describe('summarizeFilters', () => {
  it('"Software · Cajicá, Chía · Solo vigentes"', () => {
    const filters = {
      ...withDefaults(),
      industry: ['software'],
      municipality: ['25126', '25175'],
      onlyActive: true,
    };
    expect(summarizeFilters(filters, names)).toBe(
      'Desarrollo de Software · Cajicá, Chía · Solo vigentes',
    );
  });

  it('sin filtros lo dice', () => {
    expect(summarizeFilters(withDefaults(), names)).toBe('Sin filtros');
  });
});

describe('máscara de montos', () => {
  it.each([
    ['17500000', '17.500.000'],
    ['$ 1.000', '1.000'],
    ['000123', '123'],
    ['', ''],
  ])('maskCop(%j) = %j', (input, expected) => {
    expect(maskCop(input)).toBe(expected);
  });

  it('unmaskCop devuelve el número o null', () => {
    expect(unmaskCop('17.500.000')).toBe(17_500_000);
    expect(unmaskCop('')).toBeNull();
  });
});
