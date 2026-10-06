import type { EChartsCoreOption } from 'echarts/core';

import { StatsInterval, TimeSeriesPoint } from '../../api/models';
import { ChartTable } from '../../shared/charts/chart-card';
import { ChartPalette } from '../../shared/charts/chart-theme';
import { formatCop, formatCopCompact, formatCount } from '../../shared/utils/format';

/** Opciones de ECharts del panel. Funciones puras: se prueban sin dibujar nada. */

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-03-01" → "mar 2026" (mes) o "01/03" (día y semana). */
export function periodLabel(periodStart: string, interval: StatsInterval): string {
  const [year, month, day] = periodStart.split('-');
  if (interval === 'month') return `${MONTHS[Number(month) - 1]} ${year}`;
  return `${day}/${month}`;
}

/** Último día de un periodo, para filtrar al hacer clic en un punto de la serie. */
export function periodEnd(periodStart: string, interval: StatsInterval): string {
  const date = new Date(`${periodStart}T00:00:00Z`);
  if (interval === 'day') return periodStart;
  if (interval === 'week') date.setUTCDate(date.getUTCDate() + 6);
  else {
    date.setUTCMonth(date.getUTCMonth() + 1);
    date.setUTCDate(0);
  }
  return date.toISOString().slice(0, 10);
}

function axisStyle(palette: ChartPalette) {
  return {
    axisLine: { lineStyle: { color: palette.line } },
    axisLabel: { color: palette.muted },
    splitLine: { lineStyle: { color: palette.line, type: 'dashed' } },
  };
}

function tooltip(palette: ChartPalette) {
  return {
    trigger: 'axis',
    backgroundColor: palette.raised,
    borderColor: palette.line,
    textStyle: { color: palette.ink },
  };
}

export function timeSeriesOptions(
  points: readonly TimeSeriesPoint[],
  interval: StatsInterval,
  palette: ChartPalette,
): EChartsCoreOption {
  return {
    color: palette.series,
    grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    tooltip: {
      ...tooltip(palette),
      valueFormatter: (value: number) => formatCount(value),
    },
    xAxis: {
      type: 'category',
      data: points.map((p) => periodLabel(p.periodStart, interval)),
      ...axisStyle(palette),
      splitLine: { show: false },
    },
    yAxis: { type: 'value', minInterval: 1, ...axisStyle(palette) },
    series: [
      {
        name: 'Registros',
        type: points.length > 40 ? 'line' : 'bar',
        data: points.map((p) => p.count),
        smooth: true,
        showSymbol: false,
        barMaxWidth: 28,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        areaStyle: points.length > 40 ? { opacity: 0.15 } : undefined,
        cursor: 'pointer',
      },
    ],
  };
}

export interface Bar {
  key: string | null;
  label: string;
  count: number;
  totalAmount: number;
}

/** Barras horizontales ordenadas de mayor a menor (la primera arriba). */
export function horizontalBarOptions(
  bars: readonly Bar[],
  palette: ChartPalette,
  colorIndex = 0,
): EChartsCoreOption {
  const ordered = [...bars].reverse();
  return {
    color: [palette.series[colorIndex % palette.series.length]],
    grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      ...tooltip(palette),
      axisPointer: { type: 'shadow' },
      formatter: (params: { dataIndex: number }[]) => {
        const bar = ordered[params[0]?.dataIndex ?? 0];
        return bar
          ? `<strong>${escapeHtml(bar.label)}</strong><br/>${formatCount(bar.count)} registros<br/>${formatCop(bar.totalAmount)}`
          : '';
      },
    },
    xAxis: { type: 'value', minInterval: 1, ...axisStyle(palette) },
    yAxis: {
      type: 'category',
      data: ordered.map((b) => b.label),
      ...axisStyle(palette),
      axisLabel: { color: palette.ink, width: 140, overflow: 'truncate' },
      splitLine: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: ordered.map((b) => b.count),
        barMaxWidth: 18,
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        label: {
          show: true,
          position: 'right',
          color: palette.muted,
          formatter: ({ value }: { value: number }) => formatCount(value),
        },
        cursor: 'pointer',
      },
    ],
  };
}

/** Índice del clic en una gráfica de barras horizontales → barra original. */
export function barAt(bars: readonly Bar[], dataIndex: number): Bar | undefined {
  return bars[bars.length - 1 - dataIndex];
}

export function barsTable(bars: readonly Bar[], firstColumn: string): ChartTable {
  return {
    columns: [firstColumn, 'Registros', 'Monto total'],
    rows: bars.map((b) => [b.label, formatCount(b.count), formatCop(b.totalAmount)]),
  };
}

export function timeSeriesTable(
  points: readonly TimeSeriesPoint[],
  interval: StatsInterval,
): ChartTable {
  return {
    columns: ['Periodo', 'Registros', 'Monto total'],
    rows: points.map((p) => [
      periodLabel(p.periodStart, interval),
      formatCount(p.count),
      formatCopCompact(p.totalAmount),
    ]),
  };
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
