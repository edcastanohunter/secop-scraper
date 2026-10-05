import {
  computed,
  Directive,
  effect,
  inject,
  input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

import { AuthService } from './auth.service';
import { Role } from './roles';

/**
 * Renderiza el contenido solo si el usuario tiene alguno de los roles:
 * `<button *appHasRole="'procurement:export'">Exportar</button>`.
 * Las acciones sin permiso se ocultan, no se deshabilitan.
 */
@Directive({ selector: '[appHasRole]' })
export class HasRoleDirective {
  private readonly auth = inject(AuthService);
  private readonly template = inject(TemplateRef);
  private readonly container = inject(ViewContainerRef);

  readonly appHasRole = input.required<Role | readonly Role[]>();

  private readonly allowed = computed(() => {
    const required = this.appHasRole();
    return this.auth.hasAnyRole(typeof required === 'string' ? [required] : required);
  });

  private rendered = false;

  private readonly render = effect(() => {
    const allowed = this.allowed();
    if (allowed && !this.rendered) {
      this.container.createEmbeddedView(this.template);
      this.rendered = true;
    } else if (!allowed && this.rendered) {
      this.container.clear();
      this.rendered = false;
    }
  });
}
