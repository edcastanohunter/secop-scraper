import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { apiUrl } from '../../core/config/api-url';
import { SaveSearchData, SaveSearchDialog } from './save-search-dialog';

describe('SaveSearchDialog', () => {
  let fixture: ComponentFixture<SaveSearchDialog>;
  let controller: HttpTestingController;
  const close = vi.fn();

  function setup(data: Partial<SaveSearchData> = {}) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: DIALOG_DATA,
          useValue: {
            kind: 'processes',
            filters: { industry: ['software'] },
            summary: 'Software',
            ...data,
          },
        },
        { provide: DialogRef, useValue: { close } },
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SaveSearchDialog);
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;

  function typeName(value: string) {
    const input = el().querySelector<HTMLInputElement>('#saved-search-name')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit() {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  async function settle() {
    await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => {
    controller.verify();
    close.mockReset();
  });

  it('crea la búsqueda con los filtros, el tipo y la frecuencia', async () => {
    setup();
    typeName('Software en Cajicá');
    el().querySelectorAll<HTMLInputElement>('input[type=radio]')[2].click();
    await submit();

    const req = controller.expectOne(apiUrl('/saved-searches'));
    expect(req.request.body).toEqual({
      name: 'Software en Cajicá',
      kind: 'processes',
      filters: { industry: ['software'] },
      frequency: 'weekly',
    });
    req.flush({ id: '1', name: 'Software en Cajicá' }, { status: 201, statusText: 'Created' });
    await settle();
    expect(close).toHaveBeenCalledWith({ id: '1', name: 'Software en Cajicá' });
  });

  it('sin nombre no envía nada y marca el campo', async () => {
    setup();
    await submit();
    fixture.detectChanges();

    controller.expectNone(apiUrl('/saved-searches'));
    expect(el().querySelector('#saved-search-name')!.getAttribute('aria-invalid')).toBe('true');
    expect(el().textContent).toContain('Escribe un nombre.');
  });

  it('409 NameTaken se muestra en el campo nombre', async () => {
    setup();
    typeName('Repetida');
    await submit();
    controller.expectOne(apiUrl('/saved-searches')).flush(
      {
        status: 409,
        title: 'Conflict',
        errorCode: 'SavedSearch.NameTaken',
        detail: 'Another saved search…',
      },
      { status: 409, statusText: 'Conflict' },
    );
    await settle();

    expect(el().querySelector('#saved-search-name-error')!.textContent).toContain(
      'Ya tienes una búsqueda',
    );
    expect(el().querySelector('[role=alert]')).toBeNull();
    expect(close).not.toHaveBeenCalled();
  });

  it('422 LimitReached se muestra como aviso general', async () => {
    setup();
    typeName('Una más');
    await submit();
    controller
      .expectOne(apiUrl('/saved-searches'))
      .flush(
        { status: 422, title: 'Unprocessable', errorCode: 'SavedSearch.LimitReached' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    await settle();

    expect(el().querySelector('[role=alert]')!.textContent).toContain('Llegaste al máximo');
  });

  it('en edición hace PUT sin kind', async () => {
    setup({
      existing: {
        id: 'abc',
        name: 'Viejo',
        kind: 'processes',
        filters: {},
        frequency: 'daily',
        isPaused: false,
        lastAlertAt: null,
        createdAt: '2026-01-01T00:00:00Z',
        newSinceLastAlert: 0,
      },
    });
    typeName('Nuevo');
    await submit();

    const req = controller.expectOne(apiUrl('/saved-searches/abc'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      name: 'Nuevo',
      filters: { industry: ['software'] },
      frequency: 'daily',
    });
    req.flush({});
  });
});
