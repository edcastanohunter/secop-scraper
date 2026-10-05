import { summarizeFreshness } from './freshness';

describe('summarizeFreshness', () => {
  const now = Date.parse('2026-10-04T12:00:00Z');

  it('toma la sincronización más reciente y no avisa si todo tiene menos de 36 h', () => {
    const summary = summarizeFreshness(
      {
        'secop2-processes': '2026-10-04T07:00:00Z',
        'secop2-contracts': '2026-10-04T08:00:00Z',
      },
      now,
    );

    expect(summary.latest?.toISOString()).toBe('2026-10-04T08:00:00.000Z');
    expect(summary.stale).toEqual([]);
  });

  it('marca los datasets de más de 36 h y los nunca sincronizados', () => {
    const summary = summarizeFreshness(
      {
        'secop2-processes': '2026-10-04T07:00:00Z',
        'secop1-processes': '2026-10-02T23:59:00Z',
        'secop2-contracts': null,
      },
      now,
    );

    expect(summary.stale).toEqual(['Procesos SECOP I', 'Contratos SECOP II']);
  });

  it('sin datos devuelve latest null', () => {
    expect(summarizeFreshness({}, now)).toEqual({ latest: null, stale: [] });
  });
});
