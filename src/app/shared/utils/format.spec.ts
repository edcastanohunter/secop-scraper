import { deadlineUrgent, formatCop, formatCount, relativeDeadline } from './format';

describe('formatCop', () => {
  it('pesos colombianos sin decimales y con punto de miles', () => {
    expect(formatCop(17_500_000)).toBe('$ 17.500.000');
    expect(formatCop(0)).toBe('$ 0');
    expect(formatCop(1234.6)).toBe('$ 1.235');
  });

  it('sin valor muestra una raya', () => {
    expect(formatCop(null)).toBe('—');
    expect(formatCop(undefined)).toBe('—');
  });

  it('formatCount usa separador de miles es-CO', () => {
    expect(formatCount(61234)).toBe('61.234');
  });
});

describe('relativeDeadline', () => {
  // 05/10/2026 10:00 en Bogotá.
  const now = Date.parse('2026-10-05T15:00:00Z');

  it.each([
    ['2026-10-08T22:00:00Z', 'Cierra en 3 días'],
    ['2026-10-06T22:00:00Z', 'Cierra mañana'],
    ['2026-10-05T22:00:00Z', 'Cierra hoy, en 7 h'],
    ['2026-10-05T15:30:00Z', 'Cierra en menos de 1 hora'],
    ['2026-10-04T15:00:00Z', 'Cerró'],
  ])('%s → %s', (deadline, expected) => {
    expect(relativeDeadline(deadline, now)).toBe(expected);
  });

  it('cuenta días calendario de Bogotá, no bloques de 24 h', () => {
    // 23:30 en Bogotá del mismo día: sigue siendo "hoy".
    expect(relativeDeadline('2026-10-06T04:30:00Z', now)).toBe('Cierra hoy, en 14 h');
  });

  it('sin fecha o con fecha inválida devuelve null', () => {
    expect(relativeDeadline(null, now)).toBeNull();
    expect(relativeDeadline('pronto', now)).toBeNull();
  });

  it('es urgente si quedan menos de 3 días', () => {
    expect(deadlineUrgent('2026-10-07T15:00:00Z', now)).toBe(true);
    expect(deadlineUrgent('2026-10-09T15:00:00Z', now)).toBe(false);
    expect(deadlineUrgent('2026-10-01T15:00:00Z', now)).toBe(false);
  });
});
