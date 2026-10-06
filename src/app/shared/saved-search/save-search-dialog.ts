import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AlertFrequency, SavedSearch, SavedSearchFilter, SearchKind } from '../../api/models';
import { SavedSearchesService } from '../../api/saved-searches.service';
import {
  fieldErrorsFor,
  ProblemDetails,
  problemMessage,
  toProblem,
} from '../../core/http/problem-details';
import { FREQUENCY_LABELS } from '../utils/labels';

export interface SaveSearchData {
  kind: SearchKind;
  filters: SavedSearchFilter;
  /** Con una búsqueda existente, el diálogo la edita (nombre y frecuencia). */
  existing?: SavedSearch;
  /** Resumen legible de los filtros que se van a guardar. */
  summary: string;
}

const FREQUENCIES: AlertFrequency[] = ['none', 'daily', 'weekly'];
const FREQUENCY_HINTS: Record<AlertFrequency, string> = {
  none: 'Guárdala sin avisos por email.',
  daily: 'Un email al día con lo nuevo.',
  weekly: 'Un resumen cada semana.',
};

/**
 * "Guardar búsqueda": nombre y frecuencia (Nunca / Diaria / Semanal) con los filtros actuales.
 * Los errores 409 (nombre repetido) y 422 (límite, email sin verificar) se muestran aquí.
 */
@Component({
  selector: 'app-save-search-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <form
      class="card w-[min(30rem,calc(100vw-2rem))] p-6 shadow-xl"
      novalidate
      (submit)="$event.preventDefault(); submit()"
    >
      <h2 id="save-search-title" class="text-lg font-semibold">
        {{ data.existing ? 'Editar búsqueda guardada' : 'Guardar búsqueda' }}
      </h2>
      <p class="mt-1 text-sm text-muted">
        {{ data.kind === 'processes' ? 'Licitaciones' : 'Contratos' }} · {{ data.summary }}
      </p>

      @if (generalError(); as message) {
        <p class="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {{ message }}
        </p>
      }

      <div class="mt-5">
        <label class="label" for="saved-search-name">Nombre</label>
        <input
          id="saved-search-name"
          type="text"
          class="input"
          maxlength="100"
          required
          autocomplete="off"
          [value]="name()"
          [attr.aria-invalid]="nameErrors().length > 0"
          [attr.aria-describedby]="nameErrors().length > 0 ? 'saved-search-name-error' : null"
          (input)="name.set($any($event.target).value)"
        />
        @if (nameErrors().length > 0) {
          <p id="saved-search-name-error" class="field-error">{{ nameErrors().join(' ') }}</p>
        }
      </div>

      <fieldset class="mt-5">
        <legend class="label">Alertas por email</legend>
        <div class="grid gap-2 sm:grid-cols-3">
          @for (option of frequencies; track option) {
            <label
              class="flex cursor-pointer flex-col rounded-md border p-3 text-sm"
              [class]="frequency() === option ? 'border-accent bg-accent-soft' : 'border-line'"
            >
              <span class="flex items-center gap-2 font-medium">
                <input
                  type="radio"
                  name="frequency"
                  class="accent-[var(--accent)]"
                  [checked]="frequency() === option"
                  (change)="frequency.set(option)"
                />
                {{ labels[option] }}
              </span>
              <span class="mt-1 text-xs text-muted">{{ hints[option] }}</span>
            </label>
          }
        </div>
      </fieldset>

      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="ref.close()">Cancelar</button>
        <button type="submit" class="btn-primary" [disabled]="saving()">
          {{ saving() ? 'Guardando…' : 'Guardar' }}
        </button>
      </div>
    </form>
  `,
})
export class SaveSearchDialog {
  protected readonly data = inject<SaveSearchData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<SavedSearch>>(DialogRef);
  private readonly api = inject(SavedSearchesService);

  protected readonly frequencies = FREQUENCIES;
  protected readonly labels = FREQUENCY_LABELS;
  protected readonly hints = FREQUENCY_HINTS;

  protected readonly name = signal(this.data.existing?.name ?? '');
  protected readonly frequency = signal<AlertFrequency>(this.data.existing?.frequency ?? 'daily');
  protected readonly saving = signal(false);
  private readonly problem = signal<ProblemDetails | null>(null);
  private readonly touched = signal(false);

  protected readonly nameErrors = computed(() => {
    const problem = this.problem();
    const errors: string[] = [];
    if (this.touched() && !this.name().trim()) errors.push('Escribe un nombre.');
    if (problem?.errorCode === 'SavedSearch.NameTaken') errors.push(problemMessage(problem));
    if (problem) {
      errors.push(
        ...fieldErrorsFor(problem, 'name'),
        ...fieldErrorsFor(problem, 'SavedSearch.InvalidName'),
      );
    }
    return errors;
  });

  protected readonly generalError = computed(() => {
    const problem = this.problem();
    if (!problem || problem.errorCode === 'SavedSearch.NameTaken') return null;
    if (problem.status === 400 && this.nameErrors().length > 0) return null;
    return problemMessage(problem);
  });

  protected async submit(): Promise<void> {
    this.touched.set(true);
    this.problem.set(null);
    const name = this.name().trim();
    if (!name) return;

    this.saving.set(true);
    const body = { name, filters: this.data.filters, frequency: this.frequency() };
    try {
      const saved = await firstValueFrom(
        this.data.existing
          ? this.api.update(this.data.existing.id, body)
          : this.api.create({ ...body, kind: this.data.kind }),
      );
      this.ref.close(saved);
    } catch (error) {
      this.problem.set(toProblem(error));
    } finally {
      this.saving.set(false);
    }
  }
}

@Injectable({ providedIn: 'root' })
export class SaveSearchDialogService {
  private readonly dialog = inject(Dialog);

  async open(data: SaveSearchData): Promise<SavedSearch | undefined> {
    const ref = this.dialog.open<SavedSearch>(SaveSearchDialog, {
      data,
      ariaLabelledBy: 'save-search-title',
      backdropClass: 'app-backdrop',
    });
    return firstValueFrom(ref.closed);
  }
}
