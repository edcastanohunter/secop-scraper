import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-lg py-16 text-center">
      <p class="font-mono text-sm text-accent">404</p>
      <h1 class="mt-2 text-2xl font-semibold tracking-tight">No encontramos esta página</h1>
      <p class="mt-3 text-muted">
        Puede que el enlace esté incompleto o que la página ya no exista.
      </p>
      <div class="mt-6 flex justify-center gap-3">
        <a routerLink="/licitaciones" class="btn-primary">Ver licitaciones</a>
        <a routerLink="/" class="btn-secondary">Ir al panel</a>
      </div>
    </section>
  `,
})
export class NotFoundPage {}
