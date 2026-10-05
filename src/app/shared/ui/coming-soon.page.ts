import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Pantalla provisional de las rutas que aún no se han construido. Recibe `title` desde
 * `data` de la ruta (`withComponentInputBinding`). Se elimina al terminar el último incremento.
 */
@Component({
  selector: 'app-coming-soon-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">{{ heading() }}</h1>
    <div class="card mt-6 p-8 text-center text-muted">Esta sección está en construcción.</div>
  `,
})
export class ComingSoonPage {
  readonly heading = input('');
}
