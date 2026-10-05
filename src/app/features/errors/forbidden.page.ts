import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-lg py-16 text-center">
      <p class="font-mono text-sm text-accent">403</p>
      <h1 class="mt-2 text-2xl font-semibold tracking-tight">No tienes permiso</h1>
      <p class="mt-3 text-muted">
        Tu cuenta no tiene acceso a esta sección. Si crees que deberías tenerlo, pídeselo a quien
        administra SECOP Radar en tu organización.
      </p>
      <div class="mt-6 flex justify-center">
        <a routerLink="/" class="btn-primary">Volver al panel</a>
      </div>
    </section>
  `,
})
export class ForbiddenPage {}
