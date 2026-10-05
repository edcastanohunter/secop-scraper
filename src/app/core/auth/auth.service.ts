import { Signal } from '@angular/core';

import { Role } from './roles';

export interface UserProfile {
  name: string;
  email?: string;
}

/**
 * Contrato de autenticación que consume la app. Hay dos implementaciones:
 * `KeycloakAuthService` (real, PKCE) y `MockAuthService` (modo MSW, sin servidor de identidad).
 */
export abstract class AuthService {
  abstract readonly authenticated: Signal<boolean>;
  abstract readonly user: Signal<UserProfile | null>;
  abstract readonly roles: Signal<readonly string[]>;

  /** Reactivo: dentro de un `computed` o una plantilla se reevalúa cuando cambian los roles. */
  hasRole(role: Role): boolean {
    return this.roles().includes(role);
  }

  hasAnyRole(roles: readonly Role[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }

  /** `redirectPath` es una ruta de la app (`/licitaciones?…`); por defecto, la actual. */
  abstract login(redirectPath?: string): Promise<void>;
  abstract register(): Promise<void>;
  abstract logout(): Promise<void>;
  abstract accountManagement(): Promise<void>;

  /** Token vigente al menos 30 s más, o `undefined` sin sesión. */
  abstract getToken(): Promise<string | undefined>;
}
