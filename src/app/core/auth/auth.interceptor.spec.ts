import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { FakeAuthService } from '../../../testing/fake-auth.service';
import { apiUrl } from '../config/api-url';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: FakeAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useClass: FakeAuthService },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService) as FakeAuthService;
  });

  afterEach(() => controller.verify());

  /** El token se obtiene de forma asíncrona: hay que esperar a que salga la petición. */
  async function expectRequest(url: string) {
    await Promise.resolve();
    await Promise.resolve();
    return controller.expectOne(url);
  }

  it('adjunta el Bearer a la API', async () => {
    http.get(apiUrl('/processes')).subscribe();
    const req = await expectRequest(apiUrl('/processes'));

    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({});
  });

  it('no adjunta token a otros orígenes', () => {
    http.get('https://www.datos.gov.co/resource/x.json').subscribe();
    const req = controller.expectOne('https://www.datos.gov.co/resource/x.json');

    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('no adjunta token a la baja pública de alertas', () => {
    http.get(apiUrl('/alerts/unsubscribe?token=abc')).subscribe();
    const req = controller.expectOne(apiUrl('/alerts/unsubscribe?token=abc'));

    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(null);
  });

  it('sin sesión envía la petición sin cabecera', async () => {
    auth.token.set(undefined);
    http.get(apiUrl('/meta/freshness')).subscribe();
    const req = await expectRequest(apiUrl('/meta/freshness'));

    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
