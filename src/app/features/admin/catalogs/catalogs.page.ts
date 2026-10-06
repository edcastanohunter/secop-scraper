import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CatalogService } from '../../../api/catalog.service';
import { Municipality, UnresolvedLocation } from '../../../api/models';
import {
  fieldErrorsFor,
  ProblemDetails,
  problemMessage,
  toProblem,
} from '../../../core/http/problem-details';
import { ToastService } from '../../../core/notifications/toast.service';
import { MunicipalityPicker } from '../../../shared/filter-bar/municipality-picker';
import { ConfirmService } from '../../../shared/ui/confirm-dialog';
import { PageHeader } from '../../../shared/ui/page-header';
import { Pagination } from '../../../shared/ui/pagination';
import { ErrorState, Skeleton } from '../../../shared/ui/states';
import { isValidUnspscPrefix } from '../../../shared/utils/filters';
import { formatCount } from '../../../shared/utils/format';

function locationKey(location: UnresolvedLocation): string {
  return `${location.departmentRaw}|${location.municipalityRaw}`;
}

/**
 * `/admin/catalogos`: ubicaciones que el normalizador no resolvió (→ crear alias DIVIPOLA) y
 * mapeos de prefijos UNSPSC a industrias. La reclasificación tarda hasta 15 minutos.
 */
@Component({
  selector: 'app-catalogs-page',
  imports: [DatePipe, PageHeader, Pagination, ErrorState, Skeleton, MunicipalityPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      heading="Catálogos"
      eyebrow="Administración"
      subtitle="Corrige cómo se normalizan municipios e industrias."
    >
      <button
        type="button"
        class="btn-secondary"
        [disabled]="refreshing()"
        (click)="refreshDivipola()"
      >
        {{ refreshing() ? 'Recargando…' : 'Recargar DIVIPOLA' }}
      </button>
    </app-page-header>

    <p
      class="mb-6 flex items-start gap-2 rounded-md bg-info-soft px-4 py-3 text-sm text-info"
      role="note"
    >
      <svg
        class="mt-0.5 size-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8v.5" stroke-linecap="round" />
      </svg>
      Los cambios se aplican a los registros existentes en una reclasificación que tarda hasta 15
      minutos.
    </p>

    <div class="grid gap-6 xl:grid-cols-2">
      <section aria-labelledby="unresolved-title" class="min-w-0 space-y-3">
        <div>
          <h2 id="unresolved-title" class="section-title">Ubicaciones sin resolver</h2>
          <p class="text-sm text-muted">
            Escrituras de SECOP que no coinciden con un municipio DIVIPOLA, de la más frecuente a la
            menos.
          </p>
        </div>
        @if (unresolved.error(); as error) {
          <app-error-state [error]="error" (retry)="unresolved.reload()" />
        } @else if (unresolved.hasValue()) {
          @let list = unresolved.value();
          <ul class="card divide-y divide-line">
            @for (location of list.items; track key(location)) {
              <li class="p-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-medium">«{{ location.municipalityRaw }}»</p>
                    <p class="text-sm text-muted">Departamento: «{{ location.departmentRaw }}»</p>
                    <p class="mt-1 text-xs text-muted tabular">
                      {{ count(location.occurrences) }} registros · visto del
                      {{ location.firstSeenAt | date }} al {{ location.lastSeenAt | date }}
                    </p>
                  </div>
                  @if (assigning() !== key(location)) {
                    <button
                      type="button"
                      class="btn-secondary px-3 py-1.5"
                      (click)="assigning.set(key(location))"
                    >
                      Asignar municipio<span class="sr-only">
                        a «{{ location.municipalityRaw }}»</span
                      >
                    </button>
                  }
                </div>
                @if (assigning() === key(location)) {
                  <div class="mt-3 rounded-md bg-sunken p-3">
                    <app-municipality-picker
                      label="Municipio DIVIPOLA"
                      placeholder="Busca el municipio correcto"
                      (picked)="assign(location, $event)"
                    />
                    <button type="button" class="link mt-2 text-sm" (click)="assigning.set(null)">
                      Cancelar
                    </button>
                  </div>
                }
              </li>
            } @empty {
              <li class="p-6 text-center text-sm text-muted">
                No hay ubicaciones pendientes. ¡Todo normalizado!
              </li>
            }
          </ul>
          <app-pagination
            [page]="list.page"
            [pageSize]="list.pageSize"
            [total]="list.totalCount"
            (pageChange)="page.set($event)"
            (pageSizeChange)="pageSize.set($event); page.set(1)"
          />
        } @else {
          <app-skeleton [rows]="5" />
        }
      </section>

      <section aria-labelledby="mappings-title" class="min-w-0 space-y-3">
        <div>
          <h2 id="mappings-title" class="section-title">Mapeos UNSPSC → industria</h2>
          <p class="text-sm text-muted">
            Un prefijo de 2, 4, 6 u 8 dígitos clasifica todos los códigos que empiezan por él.
          </p>
        </div>

        <form
          class="card grid gap-3 p-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-start"
          novalidate
          (submit)="$event.preventDefault(); saveMapping()"
        >
          <div>
            <label class="label" for="mapping-prefix">Prefijo</label>
            <input
              id="mapping-prefix"
              type="text"
              inputmode="numeric"
              class="input font-mono"
              maxlength="8"
              placeholder="4323"
              [value]="prefix()"
              [attr.aria-invalid]="!!prefixError()"
              [attr.aria-describedby]="prefixError() ? 'mapping-prefix-error' : null"
              (input)="prefix.set($any($event.target).value.trim())"
            />
            @if (prefixError(); as message) {
              <p id="mapping-prefix-error" class="field-error">{{ message }}</p>
            }
          </div>
          <div>
            <label class="label" for="mapping-industry">Industria</label>
            <select
              id="mapping-industry"
              class="input"
              [value]="industryId()"
              (change)="industryId.set($any($event.target).value)"
            >
              @for (industry of industries.value(); track industry.id) {
                <option [value]="industry.id">{{ industry.name }}</option>
              }
            </select>
          </div>
          <button type="submit" class="btn-primary sm:mt-6" [disabled]="savingMapping()">
            Guardar
          </button>
        </form>

        @if (industries.error(); as error) {
          <app-error-state [error]="error" (retry)="industries.reload()" />
        } @else if (industries.isLoading() && industries.value().length === 0) {
          <app-skeleton [rows]="6" />
        } @else {
          <ul class="card divide-y divide-line">
            @for (industry of industries.value(); track industry.id) {
              <li class="p-4">
                <p class="font-medium">
                  {{ industry.name }}
                  <span class="font-mono text-xs text-muted">{{ industry.id }}</span>
                </p>
                @if (industry.description) {
                  <p class="text-sm text-muted">{{ industry.description }}</p>
                }
                <ul
                  class="mt-2 flex flex-wrap gap-1.5"
                  [attr.aria-label]="'Prefijos de ' + industry.name"
                >
                  @for (code of industry.prefixes; track code) {
                    <li class="chip py-1 ps-2.5 pe-1 font-mono">
                      {{ code }}
                      <button
                        type="button"
                        class="grid size-5 place-items-center rounded-full hover:bg-danger-soft hover:text-danger"
                        [attr.aria-label]="'Quitar prefijo ' + code + ' de ' + industry.name"
                        (click)="removeMapping(code, industry.name)"
                      >
                        <span aria-hidden="true">✕</span>
                      </button>
                    </li>
                  } @empty {
                    <li class="text-xs text-muted">Sin prefijos asignados.</li>
                  }
                </ul>
              </li>
            }
          </ul>
        }
      </section>
    </div>
  `,
})
export class CatalogsPage {
  private readonly catalog = inject(CatalogService);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);
  protected readonly unresolved = this.catalog.unresolvedLocations(() => ({
    page: this.page(),
    pageSize: this.pageSize(),
  }));
  protected readonly industries = this.catalog.industries();
  protected readonly assigning = signal<string | null>(null);
  protected readonly refreshing = signal(false);

  protected readonly prefix = signal('');
  protected readonly industryId = signal('software');
  protected readonly savingMapping = signal(false);
  private readonly mappingSubmitted = signal(false);
  private readonly mappingProblem = signal<ProblemDetails | null>(null);

  protected readonly prefixError = computed(() => {
    const problem = this.mappingProblem();
    const fromServer = problem ? fieldErrorsFor(problem, 'prefix')[0] : undefined;
    if (fromServer) return 'El prefijo debe tener 2, 4, 6 u 8 dígitos.';
    if (!this.mappingSubmitted()) return null;
    return isValidUnspscPrefix(this.prefix()) ? null : 'El prefijo debe tener 2, 4, 6 u 8 dígitos.';
  });

  protected readonly key = locationKey;

  protected count(value: number): string {
    return formatCount(value);
  }

  protected async assign(location: UnresolvedLocation, town: Municipality): Promise<void> {
    try {
      await firstValueFrom(
        this.catalog.createLocationAlias({
          departmentRaw: location.departmentRaw,
          municipalityRaw: location.municipalityRaw,
          divipolaCode: town.divipolaCode,
        }),
      );
      this.toasts.show(
        'success',
        `«${location.municipalityRaw}» ahora es ${town.name} (${town.departmentName}).`,
      );
      this.assigning.set(null);
      this.unresolved.reload();
    } catch (error) {
      this.toasts.show('error', problemMessage(toProblem(error)));
    }
  }

  protected async saveMapping(): Promise<void> {
    this.mappingSubmitted.set(true);
    this.mappingProblem.set(null);
    const prefix = this.prefix();
    if (!isValidUnspscPrefix(prefix)) return;
    this.savingMapping.set(true);
    try {
      await firstValueFrom(
        this.catalog.upsertIndustryMapping(prefix, { industryId: this.industryId() }),
      );
      const name =
        this.industries.value().find((i) => i.id === this.industryId())?.name ?? this.industryId();
      this.toasts.show('success', `El prefijo ${prefix} ahora clasifica como ${name}.`);
      this.prefix.set('');
      this.mappingSubmitted.set(false);
      this.industries.reload();
    } catch (error) {
      const problem = toProblem(error);
      this.mappingProblem.set(problem);
      if (fieldErrorsFor(problem, 'prefix').length === 0)
        this.toasts.show('error', problemMessage(problem));
    } finally {
      this.savingMapping.set(false);
    }
  }

  protected async removeMapping(prefix: string, industryName: string): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: `¿Quitar el prefijo ${prefix}?`,
      message: `Los códigos que empiezan por ${prefix} dejarán de clasificarse como ${industryName}.`,
      confirmLabel: 'Quitar',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await firstValueFrom(this.catalog.deleteIndustryMapping(prefix));
      this.toasts.show('success', `Quitaste el prefijo ${prefix}.`);
      this.industries.reload();
    } catch (error) {
      this.toasts.show('error', problemMessage(toProblem(error)));
    }
  }

  protected async refreshDivipola(): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: '¿Recargar DIVIPOLA?',
      message: 'Se vuelven a descargar departamentos y municipios desde datos.gov.co.',
      confirmLabel: 'Recargar',
    });
    if (!confirmed) return;
    this.refreshing.set(true);
    try {
      const result = await firstValueFrom(this.catalog.refreshDivipola());
      this.toasts.show(
        'success',
        `DIVIPOLA recargada: ${formatCount(result.departments)} departamentos y ${formatCount(result.municipalities)} municipios.`,
      );
    } catch (error) {
      this.toasts.show('error', problemMessage(toProblem(error)));
    } finally {
      this.refreshing.set(false);
    }
  }
}
