import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FILTER_DEFAULTS_KEY, FilterStateService } from './filter-state.service';

@Component({ template: '', providers: [FilterStateService] })
class HostPage {
  readonly state = inject(FilterStateService);
}

describe('FilterStateService', () => {
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'licitaciones',
            component: HostPage,
            data: { [FILTER_DEFAULTS_KEY]: { onlyActive: true } },
          },
        ]),
      ],
    });
    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
  });

  async function open(url: string): Promise<FilterStateService> {
    const page = await harness.navigateByUrl(url, HostPage);
    return page.state;
  }

  it('lee los filtros de la URL con los defectos de la ruta', async () => {
    const state = await open('/licitaciones?industry=software&municipality=25126');

    expect(state.filters()).toMatchObject({
      industry: ['software'],
      municipality: ['25126'],
      onlyActive: true,
    });
    expect(state.activeCount()).toBe(2);
  });

  it('update escribe en la URL, vuelve a la página 1 y omite los defectos', async () => {
    const state = await open('/licitaciones?page=4&industry=software');
    await state.update({ municipality: ['25126'] });

    expect(router.url).toBe('/licitaciones?industry=software&municipality=25126');
    expect(state.filters().page).toBe(1);
  });

  it('cambiar de página conserva los filtros', async () => {
    const state = await open('/licitaciones?industry=software');
    await state.update({ page: 2 });

    expect(router.url).toBe('/licitaciones?industry=software&page=2');
  });

  it('reset limpia filtros pero conserva el tamaño de página', async () => {
    const state = await open('/licitaciones?industry=software&onlyActive=false&pageSize=50');
    await state.reset();

    expect(router.url).toBe('/licitaciones?pageSize=50');
    expect(state.filters().onlyActive).toBe(true);
  });
});
