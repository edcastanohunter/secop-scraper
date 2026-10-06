import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';

import { ErrorState, Skeleton } from '../ui/states';

export interface ChartTable {
  columns: string[];
  rows: (string | number)[][];
}

export interface ChartPoint {
  name: string;
  dataIndex: number;
}

let nextId = 0;

/**
 * Tarjeta de gráfica: título, acciones, la gráfica (en `@defer`, al entrar en pantalla) y la
 * alternativa accesible "Ver datos" con una tabla de los mismos valores.
 */
@Component({
  selector: 'app-chart-card',
  imports: [NgxEchartsDirective, Skeleton, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="card flex h-full flex-col p-4 sm:p-5" [attr.aria-labelledby]="titleId">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 [id]="titleId" class="section-title">{{ heading() }}</h2>
          @if (description()) {
            <p class="text-sm text-muted">{{ description() }}</p>
          }
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <ng-content select="[slot=actions]" />
          <button
            type="button"
            class="btn-ghost px-2 py-1 text-xs"
            [attr.aria-expanded]="showTable()"
            [attr.aria-controls]="tableId"
            (click)="showTable.set(!showTable())"
          >
            {{ showTable() ? 'Ver gráfica' : 'Ver datos' }}
          </button>
        </div>
      </div>

      <div class="mt-4 flex-1">
        @if (error()) {
          <app-error-state [error]="error()" (retry)="retry.emit()" />
        } @else if (loading() && !table()) {
          <app-skeleton variant="block" [height]="height()" />
        } @else if (empty()) {
          <p class="grid place-items-center text-sm text-muted" [style.height.px]="height()">
            Sin datos para estos filtros.
          </p>
        } @else if (showTable()) {
          <div [id]="tableId" class="max-h-80 overflow-auto">
            <table class="table-base">
              <caption class="sr-only">
                {{
                  heading()
                }}
              </caption>
              <thead>
                <tr>
                  @for (column of table()?.columns ?? []; track $index) {
                    <th scope="col">{{ column }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of table()?.rows ?? []; track $index) {
                  <tr>
                    @for (cell of row; track $index) {
                      <td class="tabular">{{ cell }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          @defer (on viewport) {
            <div
              echarts
              role="img"
              [attr.aria-label]="heading() + '. Usa Ver datos para leer los valores.'"
              [options]="options()"
              [loading]="loading()"
              [autoResize]="true"
              [style.height.px]="height()"
              (chartClick)="
                pointClick.emit({ name: $any($event).name, dataIndex: $any($event).dataIndex })
              "
            ></div>
          } @placeholder {
            <app-skeleton variant="block" [height]="height()" />
          }
        }
      </div>
      <ng-content />
    </section>
  `,
})
export class ChartCard {
  readonly heading = input.required<string>();
  readonly description = input<string>();
  readonly options = input.required<EChartsCoreOption>();
  readonly table = input<ChartTable | null>(null);
  readonly loading = input(false);
  readonly error = input<unknown>(undefined);
  readonly empty = input(false);
  readonly height = input(280);
  readonly pointClick = output<ChartPoint>();
  readonly retry = output();

  private readonly id = nextId++;
  protected readonly titleId = `chart-${this.id}-title`;
  protected readonly tableId = `chart-${this.id}-table`;
  protected readonly showTable = signal(false);
}
