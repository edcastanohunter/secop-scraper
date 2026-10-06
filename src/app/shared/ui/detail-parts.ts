import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Migas de pan con el listado de origen. */
@Component({
  selector: 'app-back-link',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      [routerLink]="link()"
      class="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-accent"
    >
      <span aria-hidden="true">←</span> {{ label() }}
    </a>
  `,
})
export class BackLink {
  readonly link = input.required<string>();
  readonly label = input.required<string>();
}

/** "Ver en SECOP" en una pestaña nueva, sin `opener` ni `referrer`. */
@Component({
  selector: 'app-secop-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (url()) {
      <a class="btn-primary" [href]="url()" target="_blank" rel="noopener noreferrer">
        Ver en SECOP
        <svg
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path
            d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="sr-only">(abre en una pestaña nueva)</span>
      </a>
    }
  `,
})
export class SecopLink {
  readonly url = input<string | null>(null);
}
