import { computed, effect, inject, Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';
import { KEYCLOAK_EVENT_SIGNAL, KeycloakEventType } from 'keycloak-angular';

import { AuthService, UserProfile } from './auth.service';

const MIN_TOKEN_VALIDITY_SECONDS = 30;

@Injectable()
export class KeycloakAuthService extends AuthService {
  private readonly keycloak = inject(Keycloak);
  private readonly event = inject(KEYCLOAK_EVENT_SIGNAL);

  /** keycloak-js no es reactivo: cada evento (ready, refresh, logout…) vuelve a leer su estado. */
  private readonly token = computed(() => {
    this.event();
    return this.keycloak.authenticated ? this.keycloak.tokenParsed : undefined;
  });

  readonly authenticated = computed(() => this.token() !== undefined);

  readonly user = computed<UserProfile | null>(() => {
    const token = this.token();
    if (!token) return null;
    const name: unknown = token['name'] ?? token['preferred_username'];
    const email: unknown = token['email'];
    return {
      name: typeof name === 'string' ? name : 'Usuario',
      email: typeof email === 'string' ? email : undefined,
    };
  });

  readonly roles = computed<readonly string[]>(() => this.token()?.realm_access?.roles ?? []);

  private readonly refreshOnExpiry = effect(() => {
    if (this.event().type === KeycloakEventType.TokenExpired) {
      this.keycloak.updateToken(MIN_TOKEN_VALIDITY_SECONDS).catch(() => this.login());
    }
  });

  login(redirectPath?: string): Promise<void> {
    return this.keycloak.login({ redirectUri: this.absolute(redirectPath) });
  }

  register(): Promise<void> {
    return this.keycloak.register({ redirectUri: this.absolute('/') });
  }

  logout(): Promise<void> {
    return this.keycloak.logout({ redirectUri: this.absolute('/acerca-de-los-datos') });
  }

  accountManagement(): Promise<void> {
    return this.keycloak.accountManagement();
  }

  async getToken(): Promise<string | undefined> {
    if (!this.keycloak.authenticated) return undefined;
    try {
      await this.keycloak.updateToken(MIN_TOKEN_VALIDITY_SECONDS);
    } catch {
      // La sesión de Keycloak expiró: no hay refresh posible, hay que volver a entrar.
      await this.login();
      return undefined;
    }
    return this.keycloak.token;
  }

  private absolute(path = window.location.pathname + window.location.search): string {
    return window.location.origin + path;
  }
}
