import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FakeAuthService } from '../../../testing/fake-auth.service';
import { AuthService } from './auth.service';
import { HasRoleDirective } from './has-role.directive';

@Component({
  imports: [HasRoleDirective],
  template: `
    <button *appHasRole="'procurement:export'" id="export">Exportar</button>
    <a *appHasRole="['catalog:write', 'ingestion:run']" id="admin">Admin</a>
  `,
})
class HostComponent {}

describe('HasRoleDirective', () => {
  let auth: FakeAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: AuthService, useClass: FakeAuthService }],
    });
    auth = TestBed.inject(AuthService) as FakeAuthService;
  });

  async function render(roles: string[]) {
    auth.grantedRoles.set(roles);
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    return fixture;
  }

  it('oculta la acción sin el rol', async () => {
    const fixture = await render(['procurement:read']);
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('#export')).toBeNull();
    expect(el.querySelector('#admin')).toBeNull();
  });

  it('muestra la acción con el rol, o con cualquiera de una lista', async () => {
    const fixture = await render(['procurement:export', 'ingestion:run']);
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('#export')).not.toBeNull();
    expect(el.querySelector('#admin')).not.toBeNull();
  });

  it('reacciona cuando cambian los roles', async () => {
    const fixture = await render(['procurement:export']);
    auth.grantedRoles.set([]);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('#export')).toBeNull();
  });
});
