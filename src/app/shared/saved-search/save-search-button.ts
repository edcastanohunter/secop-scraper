import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { SearchKind } from '../../api/models';
import { ToastService } from '../../core/notifications/toast.service';
import { summarizeFilters } from '../filter-bar/describe-filters';
import { FilterLookups } from '../filter-bar/filter-context';
import { SearchFilters, toSavedSearchFilter } from '../utils/filters';
import { SaveSearchDialogService } from './save-search-dialog';

/** "Guardar búsqueda" con los filtros actuales. Se usa dentro de `*appHasRole="'alerts:manage'"`. */
@Component({
  selector: 'app-save-search-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="btn-secondary" (click)="open()">
      <svg
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M6 4h12v16l-6-4-6 4z" stroke-linejoin="round" />
      </svg>
      Guardar búsqueda
    </button>
  `,
})
export class SaveSearchButton {
  private readonly dialog = inject(SaveSearchDialogService);
  private readonly lookups = inject(FilterLookups);
  private readonly toasts = inject(ToastService);

  readonly kind = input.required<SearchKind>();
  readonly filters = input.required<SearchFilters>();

  protected async open(): Promise<void> {
    const filters = this.filters();
    const saved = await this.dialog.open({
      kind: this.kind(),
      filters: toSavedSearchFilter(filters, this.kind()),
      summary: summarizeFilters(filters, {
        industry: (id) => this.lookups.industryName(id),
        department: (code) => this.lookups.departmentName(code),
        municipality: (code) => this.lookups.municipalityLabel(code),
      }),
    });
    if (saved) {
      this.toasts.show('success', `Guardaste "${saved.name}". La encuentras en Mis búsquedas.`);
    }
  }
}
