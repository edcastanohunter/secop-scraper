import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ToastHost } from '../notifications/toast-host';
import { Footer } from './footer';
import { Header } from './header';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Header, Footer, ToastHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh flex-col' },
  template: `
    <a
      href="#contenido"
      class="sr-only z-50 rounded-md bg-accent px-4 py-2 text-on-accent focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >Saltar al contenido</a
    >
    <app-header />
    <main id="contenido" tabindex="-1" class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      <router-outlet />
    </main>
    <app-footer />
    <app-toast-host />
  `,
})
export class Shell {}
