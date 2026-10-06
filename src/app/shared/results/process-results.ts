import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProcessSummary } from '../../api/models';
import { CopCurrencyPipe } from '../pipes/cop-currency.pipe';
import { BadgeVigente, SourceBadge, StatusBadge } from '../ui/badges';
import { IndustryChips, LocationCell } from '../ui/record-cells';

/** Procesos: tabla en escritorio y tarjetas en móvil (< 768 px). */
@Component({
  selector: 'app-process-results',
  imports: [
    RouterLink,
    DatePipe,
    CopCurrencyPipe,
    BadgeVigente,
    StatusBadge,
    SourceBadge,
    IndustryChips,
    LocationCell,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card hidden overflow-x-auto md:block">
      <table class="table-base">
        <caption class="sr-only">
          {{
            caption()
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col" class="w-[34%]">Proceso</th>
            <th scope="col">Municipio</th>
            <th scope="col">Industrias</th>
            <th scope="col" class="text-end">Precio base</th>
            <th scope="col">Publicado</th>
            <th scope="col">Estado</th>
          </tr>
        </thead>
        <tbody>
          @for (item of items(); track item.source + item.sourceId) {
            <tr class="hover:bg-sunken/60" [class.row-active]="item.isActive">
              <td>
                <a
                  class="font-medium text-ink hover:text-accent hover:underline"
                  [routerLink]="['/licitaciones', item.source, item.sourceId]"
                  >{{ item.title }}</a
                >
                <p class="mt-0.5 text-xs text-muted">{{ item.entityName }}</p>
              </td>
              <td><app-location-cell [location]="item.location" /></td>
              <td><app-industry-chips [industries]="item.industries" [max]="2" /></td>
              <td class="text-end whitespace-nowrap tabular">{{ item.basePrice | copCurrency }}</td>
              <td class="whitespace-nowrap tabular">{{ item.publishedAt | date }}</td>
              <td>
                <div class="flex flex-col items-start gap-1">
                  <app-status-badge [status]="item.status" />
                  <app-badge-vigente [active]="item.isActive" [deadline]="item.offersDeadlineAt" />
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <ul class="space-y-3 md:hidden" [attr.aria-label]="caption()">
      @for (item of items(); track item.source + item.sourceId) {
        <li class="card p-4" [class.border-success]="item.isActive">
          <div class="flex items-start justify-between gap-2">
            <app-status-badge [status]="item.status" />
            <app-source-badge [source]="item.source" />
          </div>
          <a
            class="mt-2 block font-medium hover:text-accent hover:underline"
            [routerLink]="['/licitaciones', item.source, item.sourceId]"
            >{{ item.title }}</a
          >
          <p class="mt-1 text-sm text-muted">{{ item.entityName }}</p>
          <dl class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div>
              <dt class="text-xs text-muted">Municipio</dt>
              <dd><app-location-cell [location]="item.location" /></dd>
            </div>
            <div>
              <dt class="text-xs text-muted">Precio base</dt>
              <dd class="font-medium tabular">{{ item.basePrice | copCurrency }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">Publicado</dt>
              <dd class="tabular">{{ item.publishedAt | date }}</dd>
            </div>
          </dl>
          <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
            <app-industry-chips [industries]="item.industries" [max]="2" />
            <app-badge-vigente [active]="item.isActive" [deadline]="item.offersDeadlineAt" />
          </div>
        </li>
      }
    </ul>
  `,
})
export class ProcessResults {
  readonly items = input.required<readonly ProcessSummary[]>();
  readonly caption = input('Procesos de contratación');
}
