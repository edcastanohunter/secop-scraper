import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';

import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-user-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close(true)',
  },
  template: `
    @if (auth.user(); as user) {
      <button
        #trigger
        type="button"
        class="btn-ghost px-2"
        aria-haspopup="menu"
        [attr.aria-expanded]="open()"
        aria-controls="user-menu"
        (click)="toggle()"
      >
        <span
          class="grid size-8 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
          aria-hidden="true"
          >{{ initials() }}</span
        >
        <span class="hidden max-w-40 truncate md:inline">{{ user.name }}</span>
        <span class="sr-only md:hidden">Menú de usuario</span>
      </button>

      @if (open()) {
        <div
          id="user-menu"
          role="menu"
          aria-label="Menú de usuario"
          class="card absolute end-0 z-40 mt-2 w-64 p-1 shadow-lg"
        >
          <div class="border-b border-line px-3 py-2">
            <p class="truncate font-medium">{{ user.name }}</p>
            @if (user.email) {
              <p class="truncate text-sm text-muted">{{ user.email }}</p>
            }
          </div>
          <button
            #firstItem
            type="button"
            role="menuitem"
            class="btn-ghost w-full justify-start"
            (click)="account()"
          >
            Mi cuenta
          </button>
          <button
            type="button"
            role="menuitem"
            class="btn-ghost w-full justify-start"
            (click)="logout()"
          >
            Cerrar sesión
          </button>
        </div>
      }
    }
  `,
})
export class UserMenu {
  protected readonly auth = inject(AuthService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly firstItem = viewChild<ElementRef<HTMLButtonElement>>('firstItem');

  protected readonly open = signal(false);
  protected readonly initials = computed(() =>
    (this.auth.user()?.name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join(''),
  );

  protected toggle(): void {
    this.open.update((open) => !open);
    if (this.open()) {
      // El menú aún no existe en el DOM: se enfoca su primera opción tras pintarlo.
      afterNextRender(() => this.firstItem()?.nativeElement.focus(), { injector: this.injector });
    }
  }

  protected close(restoreFocus = false): void {
    if (!this.open()) return;
    this.open.set(false);
    if (restoreFocus) this.trigger()?.nativeElement.focus();
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  protected account(): void {
    this.close();
    void this.auth.accountManagement();
  }

  protected logout(): void {
    this.close();
    void this.auth.logout();
  }
}
