import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
} from '@angular/core';

import { FilterStateService } from '../utils/filter-state.service';
import { describeFilters, FilterChip, removeChip } from './describe-filters';
import { FilterLookups } from './filter-context';
import { FilterDrawer } from './filter-drawer.service';

/** Espera tras la última tecla antes de buscar (requisito 1 del prompt). */
export const SEARCH_DEBOUNCE_MS = 400;

/**
 * Parte superior de la barra de filtros: buscador de texto con debounce, botón "Filtros" con
 * contador (móvil) y chips de los filtros activos.
 */
@Component({
  selector: 'app-filter-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex gap-2">
      @if (lookups.showsSearchFields) {
        <div class="relative flex-1">
          <svg
            class="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" stroke-linecap="round" />
          </svg>
          <input
            type="search"
            class="input ps-9"
            [placeholder]="placeholder()"
            [attr.aria-label]="label()"
            [value]="text()"
            (input)="onInput($any($event.target).value)"
            (keydown.enter)="flush()"
          />
        </div>
      } @else {
        <div class="flex-1"></div>
      }
      <button
        type="button"
        class="btn-secondary lg:hidden"
        aria-controls="panel-filtros"
        [attr.aria-expanded]="drawer.open()"
        (click)="drawer.show()"
      >
        <svg
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M4 6h16M7 12h10M10 18h4" stroke-linecap="round" />
        </svg>
        Filtros
        @if (state.activeCount() > 0) {
          <span class="badge-accent"
            >{{ state.activeCount() }}<span class="sr-only"> activos</span></span
          >
        }
      </button>
    </div>

    @if (chips().length > 0) {
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <ul class="contents" aria-label="Filtros activos">
          @for (chip of chips(); track chip.key + (chip.value ?? '')) {
            <li class="chip bg-accent-soft py-1 ps-3 pe-1 text-accent">
              <span class="truncate">{{ chip.label }}</span>
              <button
                type="button"
                class="grid size-5 place-items-center rounded-full hover:bg-accent hover:text-on-accent"
                [attr.aria-label]="'Quitar filtro ' + chip.label"
                (click)="remove(chip)"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </li>
          }
        </ul>
        <button type="button" class="link text-sm" (click)="state.reset()">Limpiar filtros</button>
      </div>
    }
  `,
})
export class FilterSearch {
  protected readonly state = inject(FilterStateService);
  protected readonly lookups = inject(FilterLookups);
  protected readonly drawer = inject(FilterDrawer);

  readonly placeholder = input('Busca por objeto, entidad o referencia: "papelería" -tóner');
  readonly label = input('Buscar');

  /** Texto escrito; se resincroniza si la URL cambia por otra vía (chips, atrás/adelante). */
  protected readonly text = linkedSignal(() => this.state.filters().q);
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected readonly chips = computed(() =>
    describeFilters(
      this.state.filters(),
      {
        industry: (id) => this.lookups.industryName(id),
        department: (code) => this.lookups.departmentName(code),
        municipality: (code) => this.lookups.municipalityLabel(code),
      },
      this.state.defaults,
    ),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
    // Si la URL cambia, se descarta una búsqueda pendiente con el texto viejo.
    effect(() => {
      this.state.filters();
      clearTimeout(this.timer);
    });
  }

  protected onInput(value: string): void {
    this.text.set(value);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), SEARCH_DEBOUNCE_MS);
  }

  protected flush(): void {
    clearTimeout(this.timer);
    const q = this.text().trim();
    if (q !== this.state.filters().q) void this.state.update({ q });
  }

  protected remove(chip: FilterChip): void {
    void this.state.update(removeChip(this.state.filters(), chip, this.state.defaults));
  }
}
