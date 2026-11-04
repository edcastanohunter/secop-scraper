import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FakeAuthService } from '../../../testing/fake-auth.service';
import { ContractDetail } from '../../api/models';
import { AuthService } from '../../core/auth/auth.service';
import { apiUrl } from '../../core/config/api-url';
import { ContractDetailPage } from './contract-detail.page';

registerLocaleData(localeEsCo);

const ID = 'CO1.PCCNTR.9239943';
const URL = apiUrl(`/contracts/secop2/${ID}`);
const REFRESH_URL = `${URL}/refresh`;

function contract(over: Partial<ContractDetail> = {}): ContractDetail {
  return {
    source: 'secop2',
    sourceId: ID,
    description: 'Servicios profesionales',
    entityName: 'Hospital Central',
    status: 'in_progress',
    value: 577_152_576_000_000,
    paidValue: 22_689_333,
    location: { municipalityRaw: 'Bogotá', departmentRaw: 'Bogotá D.C.' },
    unspscCodes: [],
    industries: [],
    firstSeenAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    valueFlag: 'implausible',
    refreshable: true,
    lastRefreshedAt: '2026-10-30T10:00:00Z',
    sourceUpdatedAt: '2026-10-29T10:00:00Z',
    ...over,
  } as ContractDetail;
}

describe('ContractDetailPage: refresh y valor sospechoso (SPEC 17)', () => {
  let controller: HttpTestingController;
  let auth: FakeAuthService;

  async function open(
    roles: string[],
    over: Partial<ContractDetail> = {},
  ): Promise<ComponentFixture<ContractDetailPage>> {
    auth.grantedRoles.set(roles);
    const fixture = TestBed.createComponent(ContractDetailPage);
    fixture.componentRef.setInput('source', 'secop2');
    fixture.componentRef.setInput('sourceId', ID);
    TestBed.inject(ApplicationRef).tick();
    controller.expectOne(URL).flush(contract(over));
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  const text = (f: ComponentFixture<unknown>): string => f.nativeElement.textContent;
  const button = (f: ComponentFixture<unknown>): HTMLButtonElement | null =>
    (f.nativeElement as HTMLElement).querySelector('button.btn-secondary');

  function click(f: ComponentFixture<ContractDetailPage>): void {
    button(f)!.click();
    f.detectChanges();
  }

  async function settle(f: ComponentFixture<ContractDetailPage>): Promise<void> {
    await f.whenStable();
    f.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useClass: FakeAuthService },
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService) as FakeAuthService;
  });

  afterEach(() => {
    controller.verify();
    TestBed.resetTestingModule();
  });

  it('muestra la insignia "Valor sospechoso" según valueFlag', async () => {
    const f = await open(['procurement:read']);
    expect(text(f)).toContain('Valor sospechoso');
  });

  it('no muestra la insignia si valueFlag es null', async () => {
    const f = await open(['procurement:read'], { valueFlag: null });
    expect(text(f)).not.toContain('Valor sospechoso');
  });

  it('oculta el botón sin el rol procurement:refresh', async () => {
    const f = await open(['procurement:read']);
    expect(button(f)).toBeNull();
  });

  it('oculta el botón si el contrato no es actualizable', async () => {
    const f = await open(['procurement:refresh'], { refreshable: false });
    expect(button(f)).toBeNull();
  });

  it('con el rol muestra el botón y la última actualización', async () => {
    const f = await open(['procurement:refresh']);
    expect(button(f)?.textContent).toContain('Actualizar desde SECOP');
    expect(text(f)).toContain('Actualizado por última vez');
  });

  it('changed:true reemplaza el contrato y lista los cambios', async () => {
    const f = await open(['procurement:refresh']);
    click(f);
    expect(button(f)?.disabled).toBe(true);
    const req = controller.expectOne(REFRESH_URL);
    expect(req.request.method).toBe('POST');
    req.flush({
      sourceId: ID,
      changed: true,
      refreshedAt: '2026-11-03T15:02:11Z',
      sourceUpdatedAt: '2026-11-02T10:34:41Z',
      changes: [{ field: 'value', before: 577152576000000, after: 577152576 }],
      contract: contract({ value: 577_152_576, valueFlag: null }),
    });
    await settle(f);
    expect(text(f)).toContain('Contrato actualizado con los datos de SECOP');
    expect(text(f)).toContain('Valor:');
    expect(text(f)).not.toContain('Valor sospechoso');
    expect(button(f)?.disabled).toBe(true);
    expect(button(f)?.textContent).toContain('Disponible en 60 s');
  });

  it('changed:false avisa que la fuente no cambió y sugiere corregir en SECOP II', async () => {
    const f = await open(['procurement:refresh']);
    click(f);
    controller.expectOne(REFRESH_URL).flush({
      sourceId: ID,
      changed: false,
      refreshedAt: '2026-11-03T15:02:11Z',
      sourceUpdatedAt: '2026-11-02T10:34:41Z',
      changes: [],
      contract: contract(),
    });
    await settle(f);
    expect(text(f)).toContain('SECOP todavía publica los mismos datos para este contrato.');
    expect(text(f)).toContain('Fecha de actualización en la fuente');
    expect(text(f)).toContain('la entidad contratante debe corregirlo en');
  });

  it('429 deshabilita el botón según Retry-After', async () => {
    const f = await open(['procurement:refresh']);
    click(f);
    controller
      .expectOne(REFRESH_URL)
      .flush(
        { status: 429, errorCode: 'Contracts.RefreshCooldown' },
        { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '42' } },
      );
    await settle(f);
    expect(button(f)?.disabled).toBe(true);
    expect(button(f)?.textContent).toContain('Disponible en 42 s');
    expect(f.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'menos de un minuto',
    );
  });

  it('404 NotInSource conserva el contrato y explica el motivo', async () => {
    const f = await open(['procurement:refresh']);
    click(f);
    controller
      .expectOne(REFRESH_URL)
      .flush(
        { status: 404, errorCode: 'Contracts.NotInSource' },
        { status: 404, statusText: 'Not Found' },
      );
    await settle(f);
    expect(text(f)).toContain('SECOP ya no lista este contrato');
    expect(text(f)).toContain('Servicios profesionales');
    expect(button(f)?.disabled).toBe(false);
  });

  it('502 SourceUnavailable muestra el servicio no disponible', async () => {
    const f = await open(['procurement:refresh']);
    click(f);
    controller
      .expectOne(REFRESH_URL)
      .flush(
        { status: 502, errorCode: 'Contracts.SourceUnavailable' },
        { status: 502, statusText: 'Bad Gateway' },
      );
    await settle(f);
    expect(text(f)).toContain('El servicio de datos de SECOP no está disponible');
  });
});
