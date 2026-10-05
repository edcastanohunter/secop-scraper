import { httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { AuthService } from '../core/auth/auth.service';
import { apiUrl } from '../core/config/api-url';
import { Freshness } from './meta.models';

@Injectable({ providedIn: 'root' })
export class MetaService {
  private readonly auth = inject(AuthService);

  /** Frescura global para el pie. Solo se pide con sesión: la API exige token. */
  readonly freshness = httpResource<Freshness>(() =>
    this.auth.authenticated() ? apiUrl('/meta/freshness') : undefined,
  );
}
