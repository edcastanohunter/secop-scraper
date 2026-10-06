/**
 * Solo las piezas de ECharts que usa el panel (barras y líneas). Se importa en diferido desde
 * `provideCharts()`, así ECharts nunca entra en el bundle inicial.
 */
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, SVGRenderer]);

export { echarts };
