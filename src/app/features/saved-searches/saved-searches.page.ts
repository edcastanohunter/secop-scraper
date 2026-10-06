import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { SavedSearch } from '../../api/models';
import { SavedSearchesService } from '../../api/saved-searches.service';
import { problemMessage, toProblem } from '../../core/http/problem-details';
import { ToastService } from '../../core/notifications/toast.service';
import { SaveSearchDialogService } from '../../shared/saved-search/save-search-dialog';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { PageHeader } from '../../shared/ui/page-header';
import { EmptyState, ErrorState, Skeleton } from '../../shared/ui/states';
import { savedFilterToQueryParams } from '../../shared/utils/filters';
import { FREQUENCY_LABELS } from '../../shared/utils/labels';
import { SavedSearchNames } from './saved-search-names';

/** Máximo de búsquedas guardadas por usuario (`Alerts:MaxSavedSearchesPerUser`). */
const MAX_SAVED_SEARCHES = 20;

/** `/busquedas`: tarjetas con resumen, frecuencia, último envío y novedades. */
@Component({
  selector: 'app-saved-searches-page',
  imports: [DatePipe, RouterLink, PageHeader, EmptyState, ErrorState, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      heading="Mis búsquedas"
      subtitle="Tus búsquedas guardadas y sus alertas por email. Guarda una desde Licitaciones o Contratos."
    >
      @if (searches.hasValue()) {
        <span class="text-sm text-muted tabular">{{ searches.value().length }} de {{ max }}</span>
      }
    </app-page-header>

    @if (searches.error(); as error) {
      <app-error-state [error]="error" (retry)="searches.reload()" />
    } @else if (!searches.isLoading() || searches.value().length > 0) {
      @if (searches.value().length === 0) {
        <app-empty-state
          heading="Aún no tienes búsquedas guardadas"
          message="Filtra licitaciones o contratos y pulsa 'Guardar búsqueda' para recibir alertas."
        >
          <div class="mt-4 flex gap-2">
            <a class="btn-primary" routerLink="/licitaciones">Ir a licitaciones</a>
            <a class="btn-secondary" routerLink="/contratos">Ir a contratos</a>
          </div>
        </app-empty-state>
      } @else {
        <ul class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          @for (search of searches.value(); track search.id) {
            <li class="card flex flex-col p-5" [class.opacity-75]="search.isPaused">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-xs font-semibold tracking-wide text-accent uppercase">
                    {{ search.kind === 'processes' ? 'Licitaciones' : 'Contratos' }}
                  </p>
                  <h2 class="mt-1 truncate text-lg font-semibold">
                    <a
                      class="hover:text-accent hover:underline"
                      [routerLink]="['/busquedas', search.id]"
                      >{{ search.name }}</a
                    >
                  </h2>
                </div>
                @if (search.newSinceLastAlert > 0) {
                  <span class="badge-success shrink-0">{{ search.newSinceLastAlert }} nuevos</span>
                }
              </div>
              <p class="mt-2 text-sm text-muted">{{ names.summary(search) }}</p>
              <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt class="text-xs text-muted">Alertas</dt>
                  <dd class="font-medium">
                    {{ frequencyLabels[search.frequency] }}
                    @if (search.isPaused) {
                      <span class="badge-warning ms-1">Pausada</span>
                    }
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted">Último envío</dt>
                  <dd class="tabular">
                    {{
                      search.lastAlertAt ? (search.lastAlertAt | date: 'dd/MM/yyyy HH:mm') : 'Nunca'
                    }}
                  </dd>
                </div>
              </dl>
              <div class="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                <a class="btn-primary px-3 py-1.5" [routerLink]="['/busquedas', search.id]"
                  >Ver resultados</a
                >
                <a
                  class="btn-ghost px-3 py-1.5"
                  [routerLink]="search.kind === 'processes' ? '/licitaciones' : '/contratos'"
                  [queryParams]="openParams(search)"
                  >Abrir con filtros</a
                >
                <button type="button" class="btn-ghost px-3 py-1.5" (click)="edit(search)">
                  Editar
                </button>
                @if (search.frequency !== 'none') {
                  <button
                    type="button"
                    class="btn-ghost px-3 py-1.5"
                    [disabled]="busy() === search.id"
                    (click)="togglePause(search)"
                  >
                    {{ search.isPaused ? 'Reanudar' : 'Pausar' }}
                  </button>
                }
                <button
                  type="button"
                  class="btn-ghost px-3 py-1.5 text-danger"
                  [disabled]="busy() === search.id"
                  (click)="remove(search)"
                >
                  Borrar<span class="sr-only"> {{ search.name }}</span>
                </button>
              </div>
            </li>
          }
        </ul>
      }
    } @else {
      <app-skeleton variant="cards" [rows]="3" />
    }
  `,
})
export class SavedSearchesPage {
  private readonly api = inject(SavedSearchesService);
  private readonly confirm = inject(ConfirmService);
  private readonly dialog = inject(SaveSearchDialogService);
  private readonly toasts = inject(ToastService);

  protected readonly searches = this.api.list();
  protected readonly names = new SavedSearchNames(this.searches.value);
  protected readonly frequencyLabels = FREQUENCY_LABELS;
  protected readonly max = MAX_SAVED_SEARCHES;
  protected readonly busy = signal<string | null>(null);

  protected openParams(search: SavedSearch) {
    return savedFilterToQueryParams(search.filters);
  }

  protected async edit(search: SavedSearch): Promise<void> {
    const saved = await this.dialog.open({
      kind: search.kind,
      filters: search.filters,
      existing: search,
      summary: this.names.summary(search),
    });
    if (saved) {
      this.toasts.show('success', `Actualizaste "${saved.name}".`);
      this.searches.reload();
    }
  }

  protected async togglePause(search: SavedSearch): Promise<void> {
    await this.run(
      search,
      () =>
        firstValueFrom(search.isPaused ? this.api.resume(search.id) : this.api.pause(search.id)),
      search.isPaused ? 'Reanudaste las alertas.' : 'Pausaste las alertas.',
    );
  }

  protected async remove(search: SavedSearch): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: `¿Borrar "${search.name}"?`,
      message: 'Se borran la búsqueda y su historial de alertas. No se puede deshacer.',
      confirmLabel: 'Borrar',
      danger: true,
    });
    if (!confirmed) return;
    await this.run(
      search,
      () => firstValueFrom(this.api.remove(search.id)),
      `Borraste "${search.name}".`,
    );
  }

  private async run(
    search: SavedSearch,
    action: () => Promise<unknown>,
    done: string,
  ): Promise<void> {
    this.busy.set(search.id);
    try {
      await action();
      this.toasts.show('success', done);
      this.searches.reload();
    } catch (error) {
      this.toasts.show('error', problemMessage(toProblem(error)));
    } finally {
      this.busy.set(null);
    }
  }
}
