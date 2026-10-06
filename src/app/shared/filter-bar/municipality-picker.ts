import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { CatalogService } from '../../api/catalog.service';
import { Municipality } from '../../api/models';

let nextId = 0;
const DEBOUNCE_MS = 250;

/**
 * Autocompletar de municipios contra `/catalog/municipalities?q=` (combobox ARIA 1.2).
 * Si hay departamentos elegidos, busca solo en el primero para acotar la lista.
 */
@Component({
  selector: 'app-municipality-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block', '(focusout)': 'onFocusOut($event)' },
  template: `
    <label class="label" [for]="inputId">{{ label() }}</label>
    <input
      [id]="inputId"
      type="text"
      class="input"
      role="combobox"
      autocomplete="off"
      aria-autocomplete="list"
      [attr.aria-expanded]="showList()"
      [attr.aria-controls]="listId"
      [attr.aria-activedescendant]="activeId()"
      [placeholder]="placeholder()"
      [value]="text()"
      (input)="onInput($any($event.target).value)"
      (keydown)="onKeydown($event)"
    />
    @if (showList()) {
      <ul
        [id]="listId"
        role="listbox"
        [attr.aria-label]="label()"
        class="card absolute inset-x-0 z-30 mt-1 max-h-64 overflow-auto p-1 shadow-lg"
      >
        @if (results.isLoading()) {
          <li
            class="px-3 py-2 text-sm text-muted"
            role="option"
            aria-disabled="true"
            aria-selected="false"
          >
            Buscando…
          </li>
        } @else {
          @for (town of options(); track town.divipolaCode; let i = $index) {
            <!-- Combobox ARIA: el foco se queda en el input (aria-activedescendant) y el teclado se maneja allí. -->
            <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
            <li
              [id]="listId + '-' + i"
              role="option"
              class="cursor-pointer rounded px-3 py-2 text-sm"
              [class.bg-accent-soft]="i === active()"
              [attr.aria-selected]="i === active()"
              (mousedown)="$event.preventDefault()"
              (click)="choose(town)"
            >
              {{ town.name }} <span class="text-muted">({{ town.departmentName }})</span>
            </li>
          } @empty {
            <li
              class="px-3 py-2 text-sm text-muted"
              role="option"
              aria-disabled="true"
              aria-selected="false"
            >
              Sin coincidencias
            </li>
          }
        }
      </ul>
    }
  `,
})
export class MunicipalityPicker {
  private readonly catalog = inject(CatalogService);

  readonly label = input('Municipio');
  readonly placeholder = input('Escribe un municipio, p. ej. Cajicá');
  readonly departmentCode = input<string | undefined>(undefined);
  readonly exclude = input<readonly string[]>([]);
  readonly picked = output<Municipality>();

  protected readonly inputId = `municipality-${nextId++}`;
  protected readonly listId = `${this.inputId}-list`;
  protected readonly text = signal('');
  private readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly active = signal(0);
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected readonly results = this.catalog.municipalities(() => {
    const q = this.query().trim();
    return q.length >= 2 ? { q, departmentCode: this.departmentCode() } : undefined;
  });

  protected readonly options = computed(() =>
    this.results
      .value()
      .filter((m) => !this.exclude().includes(m.divipolaCode))
      .slice(0, 12),
  );
  protected readonly showList = computed(() => this.open() && this.query().trim().length >= 2);
  protected readonly activeId = computed(() =>
    this.showList() && this.options().length > 0 ? `${this.listId}-${this.active()}` : null,
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected onInput(value: string): void {
    this.text.set(value);
    this.open.set(true);
    this.active.set(0);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.query.set(value), DEBOUNCE_MS);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.options().length;
    if (event.key === 'ArrowDown' && count > 0) {
      event.preventDefault();
      this.open.set(true);
      this.active.update((i) => (i + 1) % count);
    } else if (event.key === 'ArrowUp' && count > 0) {
      event.preventDefault();
      this.active.update((i) => (i - 1 + count) % count);
    } else if (event.key === 'Enter' && this.showList() && count > 0) {
      event.preventDefault();
      this.choose(this.options()[this.active()]);
    } else if (event.key === 'Escape' && this.open()) {
      event.stopPropagation();
      this.open.set(false);
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const host = event.currentTarget as HTMLElement;
    if (!host.contains(event.relatedTarget as Node | null)) this.open.set(false);
  }

  protected choose(town: Municipality): void {
    this.picked.emit(town);
    this.text.set('');
    this.query.set('');
    this.open.set(false);
  }
}
