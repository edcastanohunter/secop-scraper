import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { formatCount } from '../utils/format';
import { FilterOption } from './filter-context';

let nextId = 0;

/**
 * Grupo de casillas con conteos (facets). Con `single`, se comporta como radios con "Todas".
 * Muestra las primeras `visible` opciones y el resto tras "Ver más".
 */
@Component({
  selector: 'app-check-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset>
      <legend class="label">{{ legend() }}</legend>
      @if (filterable()) {
        <input
          type="search"
          class="input mb-2 py-1.5"
          [attr.aria-label]="'Filtrar ' + legend().toLowerCase()"
          placeholder="Filtrar…"
          (input)="query.set($any($event.target).value)"
        />
      }
      <ul class="space-y-0.5">
        @if (single()) {
          <li>
            <label
              class="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-sunken"
            >
              <input
                type="radio"
                class="accent-[var(--accent)]"
                [name]="id"
                [checked]="selected().length === 0"
                (change)="changed.emit([])"
              />
              <span class="flex-1">Todas</span>
            </label>
          </li>
        }
        @for (option of shown(); track option.value) {
          <li>
            <label
              class="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-sunken"
              [class.opacity-60]="option.count === 0 && !isSelected(option.value)"
            >
              <input
                [type]="single() ? 'radio' : 'checkbox'"
                class="size-4 accent-[var(--accent)]"
                [name]="id"
                [checked]="isSelected(option.value)"
                (change)="toggle(option.value, $any($event.target).checked)"
              />
              <span class="min-w-0 flex-1 truncate" [title]="option.label">{{ option.label }}</span>
              @if (option.count !== undefined) {
                <span class="text-xs text-muted tabular">{{ format(option.count) }}</span>
              }
            </label>
          </li>
        }
      </ul>
      @if (hiddenCount() > 0 || expanded()) {
        <button type="button" class="link mt-1 text-sm" (click)="expanded.set(!expanded())">
          {{ expanded() ? 'Ver menos' : 'Ver ' + hiddenCount() + ' más' }}
        </button>
      }
    </fieldset>
  `,
})
export class CheckGroup {
  readonly legend = input.required<string>();
  readonly options = input.required<readonly FilterOption[]>();
  readonly selected = input.required<readonly string[]>();
  readonly single = input(false);
  readonly visible = input(6);
  readonly filterable = input(false);
  readonly changed = output<string[]>();

  protected readonly id = `check-group-${nextId++}`;
  protected readonly expanded = signal(false);
  protected readonly query = signal('');

  /** Seleccionadas primero y luego por conteo, para que lo relevante quede arriba. */
  private readonly ordered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const selected = this.selected();
    return this.options()
      .filter((o) => !q || o.label.toLowerCase().includes(q))
      .map((o, index) => ({ o, index }))
      .sort((a, b) => {
        const sa = selected.includes(a.o.value) ? 1 : 0;
        const sb = selected.includes(b.o.value) ? 1 : 0;
        if (sa !== sb) return sb - sa;
        if (a.o.count !== undefined && b.o.count !== undefined && a.o.count !== b.o.count) {
          return b.o.count - a.o.count;
        }
        return a.index - b.index;
      })
      .map(({ o }) => o);
  });

  protected readonly shown = computed(() =>
    this.expanded() || this.query() ? this.ordered() : this.ordered().slice(0, this.visible()),
  );
  protected readonly hiddenCount = computed(() =>
    this.expanded() || this.query() ? 0 : Math.max(0, this.ordered().length - this.visible()),
  );

  protected isSelected(value: string): boolean {
    return this.selected().includes(value);
  }

  protected toggle(value: string, checked: boolean): void {
    if (this.single()) {
      this.changed.emit(checked ? [value] : []);
      return;
    }
    const current = this.selected().filter((v) => v !== value);
    this.changed.emit(checked ? [...current, value] : current);
  }

  protected format(count: number): string {
    return formatCount(count);
  }
}
