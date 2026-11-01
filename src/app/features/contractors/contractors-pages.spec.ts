import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { apiUrl } from '../../core/config/api-url';
import { FakeAuthService } from '../../../testing/fake-auth.service';
import { ContractorProfilePage } from './contractor-profile.page';
import { ContractorsRankingPage } from './contractors-ranking.page';

describe('Pantallas de contratistas (SPEC 16)', () => {
  let controller: HttpTestingController;

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
  });

  afterEach(() => {
    controller.verify();
    TestBed.resetTestingModule();
  });

  function flushBackground(): void {
    controller
      .match(() => true)
      .forEach((r) => {
        const url = r.request.url;
        if (url.includes('/catalog/industries') || url.includes('/catalog/departments')) {
          r.flush([]);
        } else if (url.includes('/stats/facets')) {
          r.flush({ industries: [], departments: [], statuses: [], sources: [] });
        } else {
          r.flush({ items: [], count: 0, totalAmount: 0 });
        }
      });
    TestBed.inject(ApplicationRef).tick();
  }

  describe('ContractorsRankingPage', () => {
    it('carga y muestra la tabla del ranking con enlaces a la ficha', async () => {
      const fixture = TestBed.createComponent(ContractorsRankingPage);
      TestBed.inject(ApplicationRef).tick();

      const req = controller.expectOne((r) => r.url === apiUrl('/stats/top-suppliers'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('sort')).toBe('amount');

      req.flush({
        items: [
          {
            supplierKey: 'nit:900123456',
            supplierName: 'ACME SAS',
            supplierNit: '900123456',
            count: 12,
            totalAmount: 450000000,
          },
          {
            supplierKey: 'nombre:DIANA MARCELA PENA',
            supplierName: 'DIANA MARCELA PENA',
            supplierNit: null,
            count: 8,
            totalAmount: 210000000,
          },
        ],
        attribution: { dataset: 'SECOP', license: 'ODbL' },
        freshness: { lastSyncedAt: { 'secop2-contracts': '2026-10-05T00:00:00Z' } },
      });

      flushBackground();
      await fixture.whenStable();
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('ACME SAS');
      expect(text).toContain('DIANA MARCELA PENA');
      expect(text).toContain('Persona jurídica');
      expect(text).toContain('Persona natural');
      expect(text).toContain('Sin NIT publicado');
    });

    it('muestra estado vacío cuando no hay resultados', async () => {
      const fixture = TestBed.createComponent(ContractorsRankingPage);
      TestBed.inject(ApplicationRef).tick();

      const req = controller.expectOne((r) => r.url === apiUrl('/stats/top-suppliers'));
      req.flush({
        items: [],
        attribution: {},
        freshness: {},
      });

      flushBackground();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Sin contratistas en este periodo');
    });
  });

  describe('ContractorProfilePage', () => {
    it('muestra la cabecera, indicadores y lista de contratos para persona jurídica', async () => {
      const fixture = TestBed.createComponent(ContractorProfilePage);
      fixture.componentRef.setInput('supplierKey', 'nit:900123456');
      TestBed.inject(ApplicationRef).tick();

      const profileReq = controller.expectOne(apiUrl('/stats/suppliers/nit%3A900123456'));
      profileReq.flush({
        supplierKey: 'nit:900123456',
        supplierName: 'ACME SAS',
        supplierNit: '900123456',
        isSme: true,
        sources: ['secop1', 'secop2'],
        firstSignedAt: '2021-03-01T15:00:00Z',
        lastSignedAt: '2024-04-01T15:00:00Z',
        count: 42,
        totalAmount: 1250000000,
        attribution: {},
        freshness: { lastSyncedAt: { 'secop2-contracts': '2026-10-05T00:00:00Z' } },
      });

      flushBackground();
      await fixture.whenStable();
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('ACME SAS');
      expect(text).toContain('NIT 900123456');
      expect(text).toContain('Mipyme ✓');
      expect(text).toContain('Persona jurídica');
      expect(text).toContain('Histórico total acumulado');
    });

    it('muestra advertencia de homónimos cuando es persona natural', async () => {
      const fixture = TestBed.createComponent(ContractorProfilePage);
      fixture.componentRef.setInput('supplierKey', 'nombre:DIANA MARCELA PENA');
      TestBed.inject(ApplicationRef).tick();

      const profileReq = controller.expectOne(
        apiUrl('/stats/suppliers/nombre%3ADIANA%20MARCELA%20PENA'),
      );
      profileReq.flush({
        supplierKey: 'nombre:DIANA MARCELA PENA',
        supplierName: 'DIANA MARCELA PENA',
        supplierNit: null,
        isSme: false,
        sources: ['secop2'],
        firstSignedAt: '2023-01-01T00:00:00Z',
        lastSignedAt: '2024-01-01T00:00:00Z',
        count: 5,
        totalAmount: 50000000,
        attribution: {},
        freshness: { lastSyncedAt: { 'secop2-contracts': '2026-10-05T00:00:00Z' } },
      });

      flushBackground();
      await fixture.whenStable();
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('DIANA MARCELA PENA');
      expect(text).toContain('Perfil agrupado por nombre');
      expect(text).toContain('Sin NIT publicado');
    });

    it('maneja el error 404 mostrando estado amigable', async () => {
      const fixture = TestBed.createComponent(ContractorProfilePage);
      fixture.componentRef.setInput('supplierKey', 'nit:999999999');
      TestBed.inject(ApplicationRef).tick();

      const profileReq = controller.expectOne(apiUrl('/stats/suppliers/nit%3A999999999'));
      profileReq.flush(
        { status: 404, errorCode: 'Suppliers.NotFound', title: 'Not Found' },
        { status: 404, statusText: 'Not Found' },
      );

      flushBackground();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Contratista no encontrado');
    });
  });
});
