import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FakeAuthService } from '../../../testing/fake-auth.service';
import { AuthService } from '../../core/auth/auth.service';
import { HasRoleDirective } from '../../core/auth/has-role.directive';
import { apiUrl } from '../../core/config/api-url';
import { ToastService } from '../../core/notifications/toast.service';
import { withDefaults } from '../utils/filters';
import { ExportButton } from './export-button';

@Component({
  imports: [ExportButton, HasRoleDirective],
  template: `<app-export-button
    *appHasRole="'procurement:export'"
    kind="processes"
    [filters]="filters()"
  />`,
})
class Host {
  readonly filters = signal(withDefaults());
}

describe('ExportButton', () => {
  let controller: HttpTestingController;
  let auth: FakeAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useClass: FakeAuthService },
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService) as FakeAuthService;
  });

  afterEach(() => vi.restoreAllMocks());

  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  }

  it('sin procurement:export no se muestra', () => {
    auth.grantedRoles.set(['procurement:read']);
    const fixture = render();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('con el permiso descarga el CSV con el nombre del servidor', async () => {
    auth.grantedRoles.set(['procurement:export']);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => 'blob:csv');
    URL.revokeObjectURL = vi.fn();
    const fixture = render();

    fixture.nativeElement.querySelector('button').click();
    controller
      .expectOne((r) => r.url === apiUrl('/processes/export'))
      .flush(new Blob(['a;b']), {
        headers: { 'Content-Disposition': 'attachment; filename="processes.csv"' },
      });
    await fixture.whenStable();

    expect(click).toHaveBeenCalledOnce();
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('processes.csv');
  });

  it('422 TooManyRows avisa el conteo y sugiere filtrar', async () => {
    auth.grantedRoles.set(['procurement:export']);
    const toasts = TestBed.inject(ToastService);
    const show = vi.spyOn(toasts, 'show');
    const fixture = render();

    fixture.nativeElement.querySelector('button').click();
    const body = JSON.stringify({
      status: 422,
      errorCode: 'Export.TooManyRows',
      detail: 'The filters match 61234 rows and an export holds at most 50000. Narrow the filters.',
    });
    controller
      .expectOne((r) => r.url === apiUrl('/processes/export'))
      .flush(new Blob([body], { type: 'application/problem+json' }), {
        status: 422,
        statusText: 'Unprocessable',
      });
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));

    expect(show).toHaveBeenCalledWith(
      'error',
      expect.stringContaining('61.234 resultados'),
      10_000,
    );
  });
});
