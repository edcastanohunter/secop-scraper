import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { Role } from './roles';

/**
 * Exige sesión y al menos uno de los roles. Sin sesión lanza el login de Keycloak
 * (volviendo a la URL pedida); sin el rol lleva a "No tienes permiso".
 */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.authenticated()) {
      void auth.login(state.url);
      return false;
    }

    return auth.hasAnyRole(roles) ? true : router.createUrlTree(['/sin-permiso']);
  };
}
