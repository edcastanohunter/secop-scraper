import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IngestionRun } from '../../../api/models';
import { apiUrl } from '../../../core/config/api-url';
import { hasActiveRuns } from './ingestion.page';
import { RunForm, runFormErrors } from './run-form';

describe('runFormErrors', () => {
  it('refresh-open solo aplica a secop2-processes', () => {
    expect(
      runFormErrors({ datasetKey: 'secop2-contracts', mode: 'refresh-open', from: '', to: '' })
        .mode,
    ).toContain('solo aplica');
    expect(
      runFormErrors({ datasetKey: 'secop2-processes', mode: 'refresh-open', from: '', to: '' }),
    ).toEqual({});
  });

  it('la ventana debe ir en orden', () => {
    expect(
      runFormErrors({
        datasetKey: 'secop1-processes',
        mode: 'backfill',
        from: '2026-02-01',
        to: '2026-01-01',
      }).to,
    ).toBeDefined();
  });
});

describe('hasActiveRuns', () => {
  const run = (status: IngestionRun['status']) => ({ status }) as IngestionRun;

  it('activa el autorefresco con runs en cola o en curso', () => {
    expect(hasActiveRuns([run('succeeded'), run('running')])).toBe(true);
    expect(hasActiveRuns([run('queued')])).toBe(true);
    expect(hasActiveRuns([run('succeeded'), run('failed')])).toBe(false);
  });
});

describe('RunForm', () => {
  it('no envía refresh-open para otro dataset y muestra el error en el campo', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const controller = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(RunForm);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const dataset = el.querySelector<HTMLSelectElement>('#run-dataset')!;
    dataset.value = 'secop2-contracts';
    dataset.dispatchEvent(new Event('change'));
    const mode = el.querySelector<HTMLSelectElement>('#run-mode')!;
    mode.value = 'refresh-open';
    mode.dispatchEvent(new Event('change'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    controller.expectNone(apiUrl('/ingestion/runs'));
    expect(el.querySelector('#run-mode-error')!.textContent).toContain('Procesos SECOP II');
    expect(mode.getAttribute('aria-invalid')).toBe('true');
  });

  it('encola el run y emite su id', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const controller = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(RunForm);
    const queued = vi.fn();
    fixture.componentInstance.queued.subscribe(queued);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    const req = controller.expectOne(apiUrl('/ingestion/runs'));
    expect(req.request.body).toEqual({
      datasetKey: 'secop2-processes',
      mode: 'incremental',
      from: null,
      to: null,
    });
    req.flush({ runId: 'r-1' }, { status: 202, statusText: 'Accepted' });
    await fixture.whenStable();

    expect(queued).toHaveBeenCalledWith('r-1');
  });
});
