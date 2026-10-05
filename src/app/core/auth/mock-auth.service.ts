import { computed, Injectable, signal } from '@angular/core';

import { AuthService, UserProfile } from './auth.service';
import { ROLES } from './roles';

/**
 * Roles del usuario simulado, separados por coma. Los tests e2e lo fijan con
 * `localStorage.setItem('secop-mock-roles', 'procurement:read')` para probar permisos.
 */
export const MOCK_ROLES_STORAGE_KEY = 'secop-mock-roles';

export function readMockRoles(): readonly string[] {
  try {
    const stored = localStorage.getItem(MOCK_ROLES_STORAGE_KEY);
    if (stored !== null) {
      return stored
        .split(',')
        .map((role) => role.trim())
        .filter(Boolean);
    }
  } catch {
    // Almacenamiento bloqueado: se usan todos los roles.
  }
  return ROLES;
}

@Injectable()
export class MockAuthService extends AuthService {
  private readonly signedIn = signal(true);

  readonly authenticated = this.signedIn.asReadonly();
  readonly roles = signal<readonly string[]>(readMockRoles()).asReadonly();
  readonly user = computed<UserProfile | null>(() =>
    this.signedIn() ? { name: 'Usuaria Demo', email: 'demo@secopradar.test' } : null,
  );

  async login(): Promise<void> {
    this.signedIn.set(true);
  }

  async register(): Promise<void> {
    this.signedIn.set(true);
  }

  async logout(): Promise<void> {
    this.signedIn.set(false);
  }

  async accountManagement(): Promise<void> {
    // Sin servidor de identidad no hay consola de cuenta.
  }

  async getToken(): Promise<string | undefined> {
    return this.signedIn() ? 'mock-token' : undefined;
  }
}
