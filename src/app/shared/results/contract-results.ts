import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ContractSummary } from '../../api/models';
import { CopCurrencyPipe } from '../pipes/cop-currency.pipe';
import { SourceBadge, StatusBadge } from '../ui/badges';
import { IndustryChips, LocationCell } from '../ui/record-cells';

/** Contratos: tabla en escritorio y tarjetas en móvil (< 768 px). */
@Component({
  selector: 'app-contract-results',
  imports: [
    RouterLink,
    DatePipe,
    CopCurrencyPipe,
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
            <th scope="col" class="w-[32%]">Contrato</th>
            <th scope="col">Contratista</th>
            <th scope="col">Municipio</th>
            <th scope="col">Industrias</th>
            <th scope="col" class="text-end">Valor</th>
            <th scope="col">Firmado</th>
            <th scope="col">Estado</th>
          </tr>
        </thead>
        <tbody>
          @for (item of items(); track item.source + item.sourceId) {
            <tr class="hover:bg-sunken/60">
              <td>
                <a
                  class="font-medium text-ink hover:text-accent hover:underline"
                  [routerLink]="['/contratos', item.source, item.sourceId]"
                  >{{ item.description }}</a
                >
                <p class="mt-0.5 text-xs text-muted">{{ item.entityName }}</p>
              </td>
              <td>
                {{ item.supplierName ?? '—' }}
                @if (item.supplierIsSme) {
                  <span class="badge-info ms-1">Mipyme</span>
                }
              </td>
              <td><app-location-cell [location]="item.location" /></td>
              <td><app-industry-chips [industries]="item.industries" [max]="2" /></td>
              <td class="text-end whitespace-nowrap tabular">{{ item.value | copCurrency }}</td>
              <td class="whitespace-nowrap tabular">{{ item.signedAt | date }}</td>
              <td><app-status-badge [status]="item.status" /></td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <ul class="space-y-3 md:hidden" [attr.aria-label]="caption()">
      @for (item of items(); track item.source + item.sourceId) {
        <li class="card p-4">
          <div class="flex items-start justify-between gap-2">
            <app-status-badge [status]="item.status" />
            <app-source-badge [source]="item.source" />
          </div>
          <a
            class="mt-2 block font-medium hover:text-accent hover:underline"
            [routerLink]="['/contratos', item.source, item.sourceId]"
            >{{ item.description }}</a
          >
          <p class="mt-1 text-sm text-muted">{{ item.entityName }}</p>
          <dl class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div>
              <dt class="text-xs text-muted">Contratista</dt>
              <dd>{{ item.supplierName ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">Valor</dt>
              <dd class="font-medium tabular">{{ item.value | copCurrency }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">Municipio</dt>
              <dd><app-location-cell [location]="item.location" /></dd>
            </div>
            <div>
              <dt class="text-xs text-muted">Firmado</dt>
              <dd class="tabular">{{ item.signedAt | date }}</dd>
            </div>
          </dl>
          <div class="mt-3"><app-industry-chips [industries]="item.industries" [max]="2" /></div>
        </li>
      }
    </ul>
  `,
})
export class ContractResults {
  readonly items = input.required<readonly ContractSummary[]>();
  readonly caption = input('Contratos');
}
