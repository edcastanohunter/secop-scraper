import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MetaService } from '../../api/meta.service';
import { FreshnessNote } from '../../shared/ui/freshness-note';

/** Atribución CC BY-SA 4.0 obligatoria (SPEC 04) y frescura global de los datos. */
@Component({
  selector: 'app-footer',
  imports: [RouterLink, FreshnessNote],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="mt-auto border-t border-line bg-raised">
      <div
        class="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-muted sm:px-6 md:flex-row md:items-center md:justify-between"
      >
        <p>
          Fuente: Colombia Compra Eficiente – SECOP, vía
          <a class="link" href="https://www.datos.gov.co" target="_blank" rel="noopener noreferrer"
            >datos.gov.co</a
          >
          · Licencia
          <a
            class="link"
            href="https://creativecommons.org/licenses/by-sa/4.0/deed.es"
            target="_blank"
            rel="noopener noreferrer"
            >CC BY-SA 4.0</a
          >
          · <a class="link" routerLink="/acerca-de-los-datos">Acerca de los datos</a>
        </p>
        @if (meta.freshness.hasValue()) {
          <app-freshness-note [lastSyncedAt]="meta.freshness.value().lastSyncedAt" />
        }
      </div>
    </footer>
  `,
})
export class Footer {
  protected readonly meta = inject(MetaService);
}
