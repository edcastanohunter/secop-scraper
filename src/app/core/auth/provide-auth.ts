import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { provideKeycloak } from 'keycloak-angular';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { KeycloakAuthService } from './keycloak-auth.service';
import { MockAuthService } from './mock-auth.service';

/**
 * Keycloak arranca con `check-sso` (silencioso) para que `/acerca-de-los-datos` sea pública.
 * El resto de rutas exige sesión mediante `roleGuard`, que lanza el login: para todo lo
 * autenticado equivale a `login-required`.
 */
export function provideAuth(): EnvironmentProviders {
  if (environment.mock) {
    return makeEnvironmentProviders([{ provide: AuthService, useClass: MockAuthService }]);
  }

  return makeEnvironmentProviders([
    provideKeycloak({
      config: environment.keycloak,
      initOptions: {
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
        pkceMethod: 'S256',
        checkLoginIframe: false,
      },
    }),
    { provide: AuthService, useClass: KeycloakAuthService },
    // Instancia el servicio al arrancar para que su efecto de refresco escuche desde el inicio.
    provideAppInitializer(() => {
      inject(AuthService);
    }),
  ]);
}
