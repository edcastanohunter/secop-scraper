import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { Municipality, Source } from '../../api/models';
import { FilterStateService } from '../utils/filter-state.service';
import { SearchFilters } from '../utils/filters';
import { AmountInput } from './amount-input';
import { CheckGroup } from './check-group';
import { FilterLookups } from './filter-context';
import { FilterDrawer } from './filter-drawer.service';
import { MunicipalityPicker } from './municipality-picker';

/**
 * Panel de filtros: industrias con conteos, ubicación jerárquica (departamento → municipios),
 * estado, fuente, modalidad, montos, fechas y los interruptores "Solo vigentes" y
 * "Solo competitivos". En escritorio es una columna; en móvil, un panel lateral.
 */
@Component({
  selector: 'app-filter-panel',
  imports: [CheckGroup, MunicipalityPicker, AmountInput, CdkTrapFocus],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    @if (drawer.open()) {
      <div
        class="fixed inset-0 z-40 bg-ink/40 lg:hidden"
        aria-hidden="true"
        (click)="close()"
      ></div>
    }
    <aside
      id="panel-filtros"
      aria-label="Filtros"
      class="lg:block"
      [class]="
        drawer.open()
          ? 'fixed inset-y-0 start-0 z-50 flex w-[min(22rem,90vw)] flex-col bg-raised shadow-xl lg:static lg:z-auto lg:w-auto lg:bg-transparent lg:shadow-none'
          : 'hidden'
      "
      [attr.role]="drawer.open() ? 'dialog' : null"
      [attr.aria-modal]="drawer.open() ? 'true' : null"
      [cdkTrapFocus]="drawer.open()"
    >
      <div class="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
        <h2 class="font-semibold">Filtros</h2>
        <button #closeButton type="button" class="btn-ghost px-2" (click)="close()">
          <span aria-hidden="true">✕</span><span class="sr-only">Cerrar filtros</span>
        </button>
      </div>

      <div
        class="flex-1 space-y-5 overflow-y-auto p-4 lg:card lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)]"
      >
        @if (lookups.showsProcessToggles()) {
          <div class="space-y-2">
            <label
              class="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium"
            >
              Solo vigentes
              <input
                type="checkbox"
                role="switch"
                class="size-4 accent-[var(--accent)]"
                [checked]="filters().onlyActive"
                (change)="set({ onlyActive: $any($event.target).checked })"
              />
            </label>
            <label
              class="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium"
            >
              Solo competitivos
              <input
                type="checkbox"
                role="switch"
                class="size-4 accent-[var(--accent)]"
                [checked]="filters().competitiveOnly"
                (change)="set({ competitiveOnly: $any($event.target).checked })"
              />
            </label>
            <p class="text-xs text-muted">
              "Solo competitivos" deja fuera la contratación directa.
            </p>
          </div>
        }

        <app-check-group
          legend="Industria"
          [options]="lookups.industryOptions()"
          [selected]="filters().industry"
          [visible]="7"
          (changed)="set({ industry: $event })"
        />

        <div class="space-y-3">
          <app-check-group
            legend="Departamento"
            [options]="lookups.departmentOptions()"
            [selected]="filters().department"
            [visible]="5"
            [filterable]="true"
            (changed)="set({ department: $event })"
          />
          <app-municipality-picker
            [departmentCode]="
              filters().department.length === 1 ? filters().department[0] : undefined
            "
            [exclude]="filters().municipality"
            (picked)="addMunicipality($event)"
          />
          @if (filters().municipality.length > 0) {
            <ul class="flex flex-wrap gap-1.5" aria-label="Municipios elegidos">
              @for (code of filters().municipality; track code) {
                <li class="chip py-1 ps-2.5 pe-1">
                  {{ lookups.municipalityLabel(code) }}
                  <button
                    type="button"
                    class="grid size-5 place-items-center rounded-full hover:bg-line"
                    [attr.aria-label]="'Quitar ' + lookups.municipalityLabel(code)"
                    (click)="removeMunicipality(code)"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </li>
              }
            </ul>
          }
        </div>

        <app-check-group
          legend="Estado"
          [options]="lookups.statusOptions()"
          [selected]="filters().status"
          (changed)="set({ status: $event })"
        />

        <app-check-group
          legend="Fuente"
          [single]="true"
          [options]="lookups.sourceOptions()"
          [selected]="filters().source ? [filters().source!] : []"
          (changed)="setSource($event)"
        />

        <app-check-group
          legend="Modalidad"
          [options]="lookups.modalityOptions"
          [selected]="filters().modality"
          [visible]="4"
          (changed)="set({ modality: $event })"
        />

        @if (lookups.showsSearchFields) {
          <div class="space-y-3">
            <div>
              <label class="label" for="filtro-entidad">Entidad</label>
              <input
                id="filtro-entidad"
                type="text"
                class="input"
                placeholder="Nombre de la entidad"
                [value]="filters().entity"
                (change)="set({ entity: $any($event.target).value.trim() })"
              />
            </div>
            <fieldset class="grid grid-cols-2 gap-2">
              <legend class="label">Monto (COP)</legend>
              <app-amount-input
                label="Mínimo"
                [value]="filters().minAmount"
                (changed)="set({ minAmount: $event })"
              />
              <app-amount-input
                label="Máximo"
                placeholder="Sin tope"
                [value]="filters().maxAmount"
                (changed)="set({ maxAmount: $event })"
              />
            </fieldset>
          </div>
        }

        <fieldset class="grid grid-cols-2 gap-2">
          <legend class="label">{{ dateLegend() }}</legend>
          <div>
            <label class="mb-1 block text-xs text-muted" for="filtro-desde">Desde</label>
            <input
              id="filtro-desde"
              type="date"
              class="input px-2"
              [value]="filters().dateFrom"
              [max]="filters().dateTo || null"
              (change)="set({ dateFrom: $any($event.target).value })"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-muted" for="filtro-hasta">Hasta</label>
            <input
              id="filtro-hasta"
              type="date"
              class="input px-2"
              [value]="filters().dateTo"
              [min]="filters().dateFrom || null"
              (change)="set({ dateTo: $any($event.target).value })"
            />
          </div>
        </fieldset>
      </div>

      <div class="flex gap-2 border-t border-line p-4 lg:hidden">
        <button type="button" class="btn-secondary flex-1" (click)="state.reset()">Limpiar</button>
        <button type="button" class="btn-primary flex-1" (click)="close()">Ver resultados</button>
      </div>
    </aside>
  `,
})
export class FilterPanel {
  protected readonly state = inject(FilterStateService);
  protected readonly lookups = inject(FilterLookups);
  protected readonly drawer = inject(FilterDrawer);
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  /** Fecha a la que se aplica el rango: publicación (procesos) o firma (contratos). */
  readonly dateField = input<'published' | 'signed' | 'record'>('published');

  protected readonly filters = this.state.filters;
  protected readonly dateLegend = computed(
    () =>
      ({
        published: 'Fecha de publicación',
        signed: 'Fecha de firma',
        record: 'Fecha',
      })[this.dateField()],
  );

  constructor() {
    effect(() => {
      if (this.drawer.open()) queueMicrotask(() => this.closeButton()?.nativeElement.focus());
    });
  }

  protected set(patch: Partial<SearchFilters>): void {
    void this.state.update(patch);
  }

  protected addMunicipality(town: Municipality): void {
    const current = this.filters().municipality;
    if (!current.includes(town.divipolaCode)) {
      this.set({ municipality: [...current, town.divipolaCode] });
    }
  }

  protected removeMunicipality(code: string): void {
    this.set({ municipality: this.filters().municipality.filter((c) => c !== code) });
  }

  protected close(): void {
    this.drawer.hide();
  }

  protected setSource(values: string[]): void {
    this.set({ source: (values[0] as Source | undefined) ?? null });
  }
}
