import { Routes } from '@angular/router';

import { roleGuard } from './core/auth/role.guard';
import { Shell } from './core/layout/shell';
import { provideCharts } from './shared/charts/chart-theme';
import { FILTER_DEFAULTS_KEY } from './shared/utils/filter-state.service';
import { defaultDateRange, FilterDefaults } from './shared/utils/filters';

/** Licitaciones arranca mostrando solo procesos vigentes y competitivos (requisito del prompt). */
const PROCESS_DEFAULTS: FilterDefaults = { onlyActive: true, competitiveOnly: true };

/** El panel muestra los últimos 12 meses (la serie temporal exige fechas). */
const dashboardDefaults = (): FilterDefaults => defaultDateRange(Date.now());

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
        providers: [provideCharts()],
        data: { [FILTER_DEFAULTS_KEY]: dashboardDefaults() },
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'licitaciones',
        title: 'Licitaciones',
        canActivate: [roleGuard('procurement:read')],
        data: { [FILTER_DEFAULTS_KEY]: PROCESS_DEFAULTS },
        loadComponent: () =>
          import('./features/processes/processes.page').then((m) => m.ProcessesPage),
      },
      {
        path: 'licitaciones/:source/:sourceId',
        title: 'Detalle de proceso',
        canActivate: [roleGuard('procurement:read')],
        loadComponent: () =>
          import('./features/processes/process-detail.page').then((m) => m.ProcessDetailPage),
      },
      {
        path: 'contratos',
        title: 'Contratos',
        canActivate: [roleGuard('procurement:read')],
        loadComponent: () =>
          import('./features/contracts/contracts.page').then((m) => m.ContractsPage),
      },
      {
        path: 'contratos/:source/:sourceId',
        title: 'Detalle de contrato',
        canActivate: [roleGuard('procurement:read')],
        loadComponent: () =>
          import('./features/contracts/contract-detail.page').then((m) => m.ContractDetailPage),
      },
      {
        path: 'buscar',
        title: 'Buscar',
        canActivate: [roleGuard('procurement:read')],
        loadComponent: () => import('./features/search/search.page').then((m) => m.SearchPage),
      },
      {
        path: 'busquedas',
        title: 'Mis búsquedas',
        canActivate: [roleGuard('alerts:manage')],
        loadComponent: () =>
          import('./features/saved-searches/saved-searches.page').then((m) => m.SavedSearchesPage),
      },
      {
        // Destino de los enlaces de los emails de alerta (SPEC 08): no cambiar.
        path: 'busquedas/:id',
        title: 'Búsqueda guardada',
        canActivate: [roleGuard('alerts:manage')],
        loadComponent: () =>
          import('./features/saved-searches/saved-search-detail.page').then(
            (m) => m.SavedSearchDetailPage,
          ),
      },
      {
        path: 'admin/ingesta',
        title: 'Ingesta',
        canActivate: [roleGuard('ingestion:run')],
        loadComponent: () =>
          import('./features/admin/ingestion/ingestion.page').then((m) => m.IngestionPage),
      },
      {
        path: 'admin/catalogos',
        title: 'Catálogos',
        canActivate: [roleGuard('catalog:write')],
        loadComponent: () =>
          import('./features/admin/catalogs/catalogs.page').then((m) => m.CatalogsPage),
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
