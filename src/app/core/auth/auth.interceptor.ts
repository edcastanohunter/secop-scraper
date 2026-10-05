import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';

import { isApiRequest, isPublicApiRequest } from '../config/api-url';
import { AuthService } from './auth.service';

/** Añade `Authorization: Bearer` a las llamadas a la API, refrescando el token si le quedan < 30 s. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url) || isPublicApiRequest(req.url)) {
    return next(req);
  }

  const auth = inject(AuthService);
  return from(auth.getToken()).pipe(
    switchMap((token) =>
      next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req),
    ),
  );
};
