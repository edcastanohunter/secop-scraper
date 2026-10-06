import { provideEchartsCore } from 'ngx-echarts';

/** Colores de las gráficas: los mismos tokens `--chart-*`, `--ink`, `--muted` y `--line` de styles.css. */
export interface ChartPalette {
  series: string[];
  ink: string;
  muted: string;
  line: string;
  raised: string;
}

const LIGHT: ChartPalette = {
  series: ['#0a6b60', '#2f6fd0', '#b26a00', '#8a4fbf'],
  ink: '#141920',
  muted: '#4f5866',
  line: '#d6dbe1',
  raised: '#ffffff',
};

const DARK: ChartPalette = {
  series: ['#4fd1bf', '#7aa7ff', '#f2b45a', '#c79bf2'],
  ink: '#e8ebef',
  muted: '#a3acb9',
  line: '#2b323c',
  raised: '#171c23',
};

export function chartPalette(dark: boolean): ChartPalette {
  return dark ? DARK : LIGHT;
}

/** ECharts se descarga al pintar la primera gráfica. */
export function provideCharts() {
  return provideEchartsCore({
    echarts: () => import('./echarts-setup').then((m) => m.echarts),
  });
}
