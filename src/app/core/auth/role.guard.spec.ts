import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

import { FakeAuthService } from '../../../testing/fake-auth.service';
import { AuthService } from './auth.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let auth: FakeAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useClass: FakeAuthService }],
    });
    auth = TestBed.inject(AuthService) as FakeAuthService;
  });

  function run(url = '/admin/ingesta') {
    const guard = roleGuard('ingestion:run');
    return TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }

  it('deja pasar con el rol', () => {
    auth.grantedRoles.set(['procurement:read', 'ingestion:run']);
    expect(run()).toBe(true);
  });

  it('sin el rol redirige a /sin-permiso', () => {
    auth.grantedRoles.set(['procurement:read']);
    const result = run();

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/sin-permiso');
  });

  it('sin sesión lanza el login volviendo a la URL pedida', () => {
    auth.signedIn.set(false);

    expect(run('/admin/ingesta?tab=runs')).toBe(false);
    expect(auth.loginCalls).toEqual(['/admin/ingesta?tab=runs']);
  });
});
