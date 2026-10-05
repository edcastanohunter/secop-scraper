import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { isApiRequest } from '../config/api-url';
import { ToastService } from '../notifications/toast.service';
import { parseRetryAfter } from './retry-after';

/**
 * Reacciones globales a errores de la API: 401 reautentica, 403 lleva a "No tienes permiso"
 * y 429 avisa con la cuenta regresiva de `Retry-After`. El error se propaga igualmente para
 * que la pantalla muestre su propio estado.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toasts = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && isApiRequest(req.url)) {
        if (error.status === 401) {
          void auth.login(router.url);
        } else if (error.status === 403) {
          void router.navigate(['/sin-permiso'], { skipLocationChange: true });
        } else if (error.status === 429) {
          toasts.rateLimited(parseRetryAfter(error.headers.get('Retry-After'), Date.now()));
        }
      }
      return throwError(() => error);
    }),
  );
};
