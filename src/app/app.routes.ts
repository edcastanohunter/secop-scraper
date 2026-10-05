import { Routes } from '@angular/router';

import { roleGuard } from './core/auth/role.guard';
import { Shell } from './core/layout/shell';

const comingSoon = () => import('./shared/ui/coming-soon.page').then((m) => m.ComingSoonPage);

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Panel',
        canActivate: [roleGuard('procurement:read')],
        loadComponent: comingSoon,
        data: { heading: 'Panel' },
      },
      {
        path: 'licitaciones',
        title: 'Licitaciones',
        canActivate: [roleGuard('procurement:read')],
        loadComponent: comingSoon,
        data: { heading: 'Licitaciones' },
      },
      {
        path: 'licitaciones/:source/:sourceId',
        title: 'Detalle de proceso',
        canActivate: [roleGuard('procurement:read')],
        loadComponent: comingSoon,
        data: { heading: 'Detalle de proceso' },
      },
      {
        path: 'contratos',
        title: 'Contratos',
        canActivate: [roleGuard('procurement:read')],
        loadComponent: comingSoon,
        data: { heading: 'Contratos' },
      },
      {
        path: 'contratos/:source/:sourceId',
        title: 'Detalle de contrato',
        canActivate: [roleGuard('procurement:read')],
        loadComponent: comingSoon,
        data: { heading: 'Detalle de contrato' },
      },
      {
        path: 'buscar',
        title: 'Buscar',
        canActivate: [roleGuard('procurement:read')],
        loadComponent: comingSoon,
        data: { heading: 'Buscar' },
      },
      {
        path: 'busquedas',
        title: 'Mis búsquedas',
        canActivate: [roleGuard('alerts:manage')],
        loadComponent: comingSoon,
        data: { heading: 'Mis búsquedas' },
      },
      {
        // Destino de los enlaces de los emails de alerta (SPEC 08): no cambiar.
        path: 'busquedas/:id',
        title: 'Búsqueda guardada',
        canActivate: [roleGuard('alerts:manage')],
        loadComponent: comingSoon,
        data: { heading: 'Búsqueda guardada' },
      },
      {
        path: 'admin/ingesta',
        title: 'Ingesta',
        canActivate: [roleGuard('ingestion:run')],
        loadComponent: comingSoon,
        data: { heading: 'Ingesta' },
      },
      {
        path: 'admin/catalogos',
        title: 'Catálogos',
        canActivate: [roleGuard('catalog:write')],
        loadComponent: comingSoon,
        data: { heading: 'Catálogos' },
      },
      {
        path: 'acerca-de-los-datos',
        title: 'Acerca de los datos',
        loadComponent: () => import('./features/about/about.page').then((m) => m.AboutPage),
      },
      {
        path: 'sin-permiso',
        title: 'No tienes permiso',
        loadComponent: () =>
          import('./features/errors/forbidden.page').then((m) => m.ForbiddenPage),
      },
      {
        path: '**',
        title: 'Página no encontrada',
        loadComponent: () => import('./features/errors/not-found.page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
