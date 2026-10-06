import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { IngestionService } from '../../../api/ingestion.service';
import { DATASET_KEYS, DatasetKey, INGESTION_MODES, IngestionMode } from '../../../api/models';
import {
  fieldErrorsFor,
  ProblemDetails,
  problemMessage,
  toProblem,
} from '../../../core/http/problem-details';
import { DATASET_LABELS, MODE_LABELS } from '../../../shared/utils/labels';

/** `refresh-open` solo existe para los procesos de SECOP II (SPEC 02). */
export function runFormErrors(value: {
  datasetKey: DatasetKey;
  mode: IngestionMode;
  from: string;
  to: string;
}): { mode?: string; to?: string } {
  const errors: { mode?: string; to?: string } = {};
  if (value.mode === 'refresh-open' && value.datasetKey !== 'secop2-processes') {
    errors.mode = '"Refrescar abiertos" solo aplica a Procesos SECOP II.';
  }
  if (value.from && value.to && value.from > value.to) {
    errors.to = 'La fecha final debe ser igual o posterior a la inicial.';
  }
  return errors;
}

const MODE_HINTS: Record<IngestionMode, string> = {
  backfill: 'Carga todo el histórico de la ventana indicada.',
  incremental: 'Trae lo modificado desde el último checkpoint.',
  reconcile: 'Compara la ventana con SECOP y corrige diferencias.',
  'refresh-open': 'Vuelve a leer los procesos abiertos para actualizar su estado.',
};

/** Formulario para encolar un run de ingesta (`POST /ingestion/runs`). */
@Component({
  selector: 'app-run-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form
      class="card space-y-4 p-5"
      novalidate
      (submit)="$event.preventDefault(); submit()"
      aria-labelledby="run-form-title"
    >
      <h2 id="run-form-title" class="section-title">Lanzar un run</h2>

      @if (generalError(); as message) {
        <p class="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {{ message }}
        </p>
      }

      <div>
        <label class="label" for="run-dataset">Dataset</label>
        <select
          id="run-dataset"
          class="input"
          [value]="datasetKey()"
          (change)="datasetKey.set($any($event.target).value)"
        >
          @for (key of datasets; track key) {
            <option [value]="key">{{ datasetLabels[key] }}</option>
          }
        </select>
      </div>

      <div>
        <label class="label" for="run-mode">Modo</label>
        <select
          id="run-mode"
          class="input"
          [value]="mode()"
          [attr.aria-invalid]="!!errors().mode"
          aria-describedby="run-mode-hint run-mode-error"
          (change)="mode.set($any($event.target).value)"
        >
          @for (key of modes; track key) {
            <option [value]="key">{{ modeLabels[key] }}</option>
          }
        </select>
        <p id="run-mode-hint" class="mt-1 text-xs text-muted">{{ modeHints[mode()] }}</p>
        @if (errors().mode; as message) {
          <p id="run-mode-error" class="field-error">{{ message }}</p>
        }
      </div>

      <fieldset class="grid grid-cols-2 gap-3">
        <legend class="label">Ventana (opcional)</legend>
        <div>
          <label class="mb-1 block text-xs text-muted" for="run-from">Desde</label>
          <input
            id="run-from"
            type="date"
            class="input px-2"
            [value]="from()"
            (change)="from.set($any($event.target).value)"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-muted" for="run-to">Hasta</label>
          <input
            id="run-to"
            type="date"
            class="input px-2"
            [value]="to()"
            [attr.aria-invalid]="!!errors().to"
            (change)="to.set($any($event.target).value)"
          />
          @if (errors().to; as message) {
            <p class="field-error">{{ message }}</p>
          }
        </div>
      </fieldset>

      <button type="submit" class="btn-primary w-full" [disabled]="saving()">
        {{ saving() ? 'Encolando…' : 'Encolar run' }}
      </button>
    </form>
  `,
})
export class RunForm {
  private readonly api = inject(IngestionService);
  readonly queued = output<string>();

  protected readonly datasets = DATASET_KEYS;
  protected readonly modes = INGESTION_MODES;
  protected readonly datasetLabels = DATASET_LABELS;
  protected readonly modeLabels = MODE_LABELS;
  protected readonly modeHints = MODE_HINTS;

  protected readonly datasetKey = signal<DatasetKey>('secop2-processes');
  protected readonly mode = signal<IngestionMode>('incremental');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly saving = signal(false);
  private readonly submitted = signal(false);
  private readonly problem = signal<ProblemDetails | null>(null);

  private readonly localErrors = computed(() =>
    runFormErrors({
      datasetKey: this.datasetKey(),
      mode: this.mode(),
      from: this.from(),
      to: this.to(),
    }),
  );

  protected readonly errors = computed(() => {
    const local = this.localErrors();
    const problem = this.problem();
    const show = this.submitted() || this.mode() === 'refresh-open';
    return {
      mode:
        (show ? local.mode : undefined) ??
        (problem ? fieldErrorsFor(problem, 'mode')[0] : undefined),
      to:
        (this.submitted() ? local.to : undefined) ??
        (problem ? fieldErrorsFor(problem, 'to')[0] : undefined),
    };
  });

  protected readonly generalError = computed(() => {
    const problem = this.problem();
    if (!problem) return null;
    if (
      problem.status === 400 &&
      problem.issues.length > 0 &&
      (this.errors().mode || this.errors().to)
    ) {
      return null;
    }
    return problemMessage(problem);
  });

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.problem.set(null);
    const local = this.localErrors();
    if (local.mode || local.to) return;

    this.saving.set(true);
    try {
      const { runId } = await firstValueFrom(
        this.api.queue({
          datasetKey: this.datasetKey(),
          mode: this.mode(),
          from: this.from() || null,
          to: this.to() || null,
        }),
      );
      this.submitted.set(false);
      this.queued.emit(runId);
    } catch (error) {
      this.problem.set(toProblem(error));
    } finally {
      this.saving.set(false);
    }
  }
}
