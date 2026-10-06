import { chartPalette } from '../../shared/charts/chart-theme';
import {
  barAt,
  barsTable,
  horizontalBarOptions,
  periodEnd,
  periodLabel,
  timeSeriesOptions,
} from './dashboard-charts';

describe('gráficas del panel', () => {
  const palette = chartPalette(false);

  it('etiquetas de periodo en español', () => {
    expect(periodLabel('2026-03-01', 'month')).toBe('mar 2026');
    expect(periodLabel('2026-03-09', 'week')).toBe('09/03');
  });

  it('fin de periodo para filtrar al hacer clic', () => {
    expect(periodEnd('2026-02-01', 'month')).toBe('2026-02-28');
    expect(periodEnd('2026-03-09', 'week')).toBe('2026-03-15');
    expect(periodEnd('2026-03-09', 'day')).toBe('2026-03-09');
  });

  it('la serie usa barras con pocos puntos y líneas con muchos', () => {
    const point = (i: number) => ({
      periodStart: `2026-01-${String(i + 1).padStart(2, '0')}`,
      count: i,
      totalAmount: 0,
    });
    const few = timeSeriesOptions([point(0), point(1)], 'day', palette) as {
      series: { type: string }[];
    };
    const many = timeSeriesOptions(
      Array.from({ length: 41 }, (_, i) => point(i % 28)),
      'day',
      palette,
    ) as {
      series: { type: string }[];
    };

    expect(few.series[0].type).toBe('bar');
    expect(many.series[0].type).toBe('line');
  });

  it('barras horizontales: la mayor arriba y el clic devuelve la barra original', () => {
    const bars = [
      { key: 'software', label: 'Software', count: 9, totalAmount: 1 },
      { key: 'salud', label: 'Salud', count: 3, totalAmount: 2 },
    ];
    const options = horizontalBarOptions(bars, palette) as { yAxis: { data: string[] } };

    expect(options.yAxis.data).toEqual(['Salud', 'Software']);
    expect(barAt(bars, 1)?.key).toBe('software');
    expect(barsTable(bars, 'Industria').rows[0]).toEqual(['Software', '9', '$ 1']);
  });
});
