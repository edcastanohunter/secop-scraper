import { computed, Injectable, signal } from '@angular/core';

import { AuthService, UserProfile } from '../app/core/auth/auth.service';

/** Doble de prueba de `AuthService` con estado controlable desde el test. */
@Injectable()
export class FakeAuthService extends AuthService {
  readonly signedIn = signal(true);
  readonly grantedRoles = signal<readonly string[]>([]);
  readonly token = signal<string | undefined>('test-token');
  readonly loginCalls: (string | undefined)[] = [];

  readonly authenticated = this.signedIn.asReadonly();
  readonly roles = this.grantedRoles.asReadonly();
  readonly user = computed<UserProfile | null>(() =>
    this.signedIn() ? { name: 'Ana Pérez', email: 'ana@example.com' } : null,
  );

  async login(redirectPath?: string): Promise<void> {
    this.loginCalls.push(redirectPath);
  }

  async register(): Promise<void> {
    // Sin efecto en tests.
  }

  async logout(): Promise<void> {
    this.signedIn.set(false);
  }

  async accountManagement(): Promise<void> {
    // Sin efecto en tests.
  }

  async getToken(): Promise<string | undefined> {
    return this.token();
  }
}
