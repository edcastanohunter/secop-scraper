# SECOP Radar — Web UI de SecopScrapper

Interfaz web para buscar licitaciones vigentes y contratos públicos de Colombia (SECOP I y II),
normalizados por municipio (DIVIPOLA) e industria (UNSPSC). Consume la API **SecopScrapper**
(`../SecopScraper/SecopScrapper`). El contrato es `SecopScrapper_V1.json` (raíz del repo).

Angular 21 (standalone, signals, zoneless) · TypeScript estricto · Tailwind CSS v4 ·
Keycloak (Authorization Code + PKCE S256) · MSW · Vitest · Playwright.

## Requisitos

- Node.js ≥ 22.12 o ≥ 24 (probado con 24.13). Angular 22 ya existe, pero pide Node ≥ 24.15;
  por eso el proyecto se queda en Angular 21.
- Para el modo real: la API en `http://localhost:5146` y Keycloak en `http://localhost:8080`
  (realm `secopscrapper`, cliente público `secopscrapper-web` con PKCE y
  `http://localhost:4200/*` como redirect URI).

## Configuración

`src/environments/environment.ts`:

```ts
export const environment: Environment = {
  mock: false,
  apiBaseUrl: 'http://localhost:5146',
  keycloak: { url: 'http://localhost:8080', realm: 'secopscrapper', clientId: 'secopscrapper-web' },
};
```

`environment.mock.ts` lo sustituye en `--configuration=mock`.

## Scripts

| Script               | Qué hace                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm start`          | `ng serve` en `http://localhost:4200` contra la API real y Keycloak.                                           |
| `npm run start:mock` | Igual, pero con MSW respondiendo la API y una sesión simulada (sin backend).                                   |
| `npm run build`      | Build de producción en `dist/secop-radar`.                                                                     |
| `npm test`           | Tests unitarios (Vitest, runner por defecto de Angular 21), una pasada.                                        |
| `npm run test:watch` | Tests unitarios en modo watch.                                                                                 |
| `npm run e2e`        | Playwright contra `start:mock` (lo levanta solo si no está corriendo).                                         |
| `npm run lint`       | ESLint (`angular-eslint`, incluidas las reglas de accesibilidad de plantillas).                                |
| `npm run format`     | Prettier.                                                                                                      |
| `npm run gen:api`    | Genera `src/app/api/generated/schema.d.ts` desde `SecopScrapper_V1.json` (`-- --from <ruta>` para otra copia). |

### Modo mock

- El service worker de MSW (`mock-public/mockServiceWorker.js`) solo se publica en la configuración
  `mock`, no en producción.
- La sesión simulada tiene todos los roles. Para probar permisos, fija los roles en la consola del
  navegador y recarga: `localStorage.setItem('secop-mock-roles', 'procurement:read')`. Los e2e
  hacen lo mismo con `useRoles()` (`e2e/fixtures.ts`).

Datos de ejemplo y casos de error deterministas (los usan los e2e):

| Qué                                    | Cómo                                                 |
| -------------------------------------- | ---------------------------------------------------- |
| Software vigente en Cajicá             | `/licitaciones?industry=software&municipality=25126` |
| Más de 10.000 resultados / export 422  | Buscar `todo` (`?q=todo`)                            |
| Scraping bloqueado (503 `HostBlocked`) | Proceso `secop2/CO1.REQ.7009999`                     |
| Nombre de búsqueda repetido (409)      | Cualquier nombre que contenga "repetida"             |
| Límite de búsquedas guardadas (422)    | Llegar a 20 búsquedas                                |

El estado (búsquedas guardadas, runs, alias, mapeos) vive en memoria: se reinicia al recargar.

### E2E

Por defecto Playwright usa el Chrome instalado (`channel: 'chrome'`). En CI, o si prefieres el
navegador de Playwright: `npx playwright install chromium` y `PW_CHANNEL=chromium npm run e2e`.

## Arquitectura

```
src/app/
  core/       auth (keycloak, interceptor, roleGuard, *appHasRole), http (errores, ProblemDetails,
              Retry-After), config (URLs de API, títulos), layout (shell, header, footer),
              theme, notifications (toasts)
  api/        generated/schema.d.ts (openapi-typescript), models.ts (alias + correcciones al
              contrato) y un servicio por recurso: catalog, processes, contracts, search, stats,
              enrichment, scraping, saved-searches, ingestion, export, meta. Los componentes nunca
              llaman a HttpClient; las lecturas son httpResource
  shared/     filter-bar (barra de filtros, estado en la URL), results (tablas/tarjetas), charts
              (ECharts en @defer), saved-search (guardar, exportar), ui, pipes, utils (puras)
  features/   dashboard, processes, contracts, search, saved-searches, admin/{ingestion,catalogs},
              about, errors; cada ruta se carga en diferido (loadComponent)
  mocks/      handlers MSW, query.ts (filtra/pagina/agrega como la API), db.ts (estado), fixtures
keycloak-theme/ tema de login de Keycloak con el diseño de la app (ver su README)
src/testing/  dobles de prueba (FakeAuthService)
e2e/          Playwright + axe
```

### Autenticación

- `provideAuth()` registra `provideKeycloak` (keycloak-angular 21) con `onLoad: 'check-sso'`
  y `silent-check-sso.html`, PKCE `S256` y sin iframe de sesión. La única página pública es
  `/acerca-de-los-datos`, que también hace de bienvenida, con "Crear cuenta" (`register()`).
- El resto de rutas lleva `roleGuard(...)`. Sin sesión lanza `keycloak.login()` volviendo a la URL
  pedida, que en la práctica equivale a `login-required`. Sin el rol, redirige a `/sin-permiso`.
- `authInterceptor` añade `Authorization: Bearer` solo a `apiBaseUrl` (no a
  `/alerts/unsubscribe`) y llama antes a `updateToken(30)`. Además, el evento `TokenExpired`
  refresca el token de forma proactiva.
- Los tokens solo viven en memoria (keycloak-js). Nada de auth en `localStorage`.
- `AuthService` es una abstracción con dos implementaciones: `KeycloakAuthService` y
  `MockAuthService`. El resto de la app no sabe cuál está activa.

### Filtros

El estado de los filtros vive en la URL. `shared/utils/filters.ts` traduce, con funciones puras,
entre query params de la app, parámetros de cada endpoint (los procesos aceptan `onlyActive` y
`competitiveOnly`, los contratos no; las estadísticas no aceptan texto, montos ni orden) y filtros
de búsquedas guardadas. `FilterStateService` (uno por pantalla, con los valores por defecto de la
ruta) los expone como signals; `/licitaciones` arranca con "Solo vigentes" y "Solo competitivos" y
el panel con los últimos 12 meses.

### Errores

`errorInterceptor` reacciona de forma global: 401 lanza el login, 403 lleva a "No tienes permiso"
y 429 muestra un toast con la cuenta regresiva de `Retry-After`. El error se propaga para que
cada pantalla muestre su estado. `toProblem()` normaliza el ProblemDetails, `problemMessage()`
lo traduce a un mensaje humano y `fieldErrorsFor()` reparte los errores de validación por campo.
El backend escribe `detail` en inglés: los `errorCode` que la UI conoce (`SavedSearch.NameTaken`,
`Export.TooManyRows`, `Scraping.HostBlocked`…) tienen su mensaje en español.

## Decisiones

- **Signals y servicios, sin NgRx.** El estado de la app es casi todo estado de servidor (lecturas
  HTTP que `httpResource` ya cachea y expone como signals) más el estado de filtros, que vive en
  la URL. No hay estado de cliente complejo y compartido que justifique un store global, sus
  acciones y su boilerplate. Los servicios con `signal`/`computed` cubren lo que queda con menos
  código y sin otra dependencia.
- **Apache ECharts (`ngx-echarts`).** Cubre todo lo que pide el panel (series temporales, barras
  horizontales y drill-down con eventos de clic), funciona bien con miles de puntos, tiene tema
  oscuro y se puede importar por módulos. Se carga con `@defer`, así que no pesa en el bundle
  inicial.
- **MSW.** Intercepta a nivel de red (service worker), así que la app usa exactamente los mismos
  servicios y el mismo `HttpClient` que en producción: no hay "servicios falsos" que se
  desincronicen. Los mismos handlers sirven para los e2e.
- **Presupuesto de bundle.** El objetivo es < 250 kB gzip de JS/CSS inicial. Los budgets de Angular
  miden tamaño sin comprimir, así que están en 700 kB (aviso) y 850 kB (error) en crudo, que es
  aproximadamente ese gzip. Con todas las pantallas, el inicial pesa ~115 kB gzip; ECharts (~160 kB
  gzip) y MSW van en chunks diferidos.
- **Fechas.** `es-CO` y zona `-0500` (America/Bogota no tiene horario de verano) en
  `DATE_PIPE_DEFAULT_OPTIONS`.

## Diferencias OpenAPI vs prompt

El contrato es `SecopScrapper_V1.json`; los tipos se generan con `npm run gen:api` y
`src/app/api/models.ts` corrige lo que el documento no expresa bien. Cuando difieren, manda el
OpenAPI (o el código del backend, si el OpenAPI está mal generado).

| Tema                               | Prompt                                                                    | OpenAPI / API real                                                                                                             | Cómo lo trata la UI                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Cuerpos de `POST`/`PUT`            | `{ name, kind, filters, frequency }`, `{ datasetKey, mode, from?, to? }`… | ASP.NET fusionó todos los `record Request` anidados en un único esquema `Request` = `{ title, description }` (el de WorkItems) | `models.ts` define los cuerpos reales leídos de `Endpoints/**` del backend; los tests de servicios verifican cada uno |
| `GET /saved-searches/{id}/results` | `SearchPage<…>`                                                           | Declara solo `SearchPage<ContractSummary>`; el backend devuelve la de procesos o la de contratos según el `kind`               | Tipo unión `SavedSearchResults`; la tabla se elige por `kind`                                                         |
| Números                            | Números                                                                   | `type: [integer, string]` (por `AllowReadingFromString`)                                                                       | El generador los tipa como `number`: la API escribe números JSON                                                      |
| Enums                              | `snake_case`                                                              | `string` sin valores                                                                                                           | Uniones literales en `models.ts`, verificadas en el dominio del backend                                               |
| `/work-items/*`                    | —                                                                         | Endpoints de la plantilla del backend                                                                                          | Sin servicio ni UI                                                                                                    |
| Filtros de `/contracts`            | Los mismos que procesos                                                   | `/contracts` y su export no aceptan `onlyActive` ni `competitiveOnly`                                                          | `toApiParams()` los omite por endpoint                                                                                |
| Fechas en estadísticas             | Obligatorias                                                              | `summary` y `facets` usan los últimos 365 días sin fechas; el resto las exige                                                  | El panel siempre manda un rango (12 meses por defecto)                                                                |
| Código de error de dominio         | Sin especificar                                                           | Extensión `errorCode`; `detail` en inglés                                                                                      | `ProblemDetails.errorCode` y mensajes en español por código                                                           |
| Errores de validación              | `errors` por campo                                                        | `errors: { code, description }[]` con 400                                                                                      | Se aceptan ambos formatos; 400 y 422 se tratan igual                                                                  |
| Conteo de `Export.TooManyRows`     | "muestra el conteo"                                                       | Solo viene dentro de `detail`                                                                                                  | `exportRowCount()` lo extrae del texto                                                                                |

## Estado por incrementos

1. ✅ **Shell y auth.** Proyecto, Tailwind con tema claro/oscuro, Keycloak con PKCE, interceptores,
   `roleGuard`, `*appHasRole`, layout accesible, pie con atribución y frescura, toasts, MSW y e2e.
2. ✅ **Catálogos y barra de filtros.** Tipos generados, servicios por recurso, filtros en la URL,
   facets con conteos, ubicación jerárquica con autocompletar, montos con máscara, drawer en móvil.
3. ✅ **Licitaciones.** Tabla/tarjetas, badge "Vigente" con cuenta regresiva, paginación, orden,
   aviso de total con tope; detalle completo, contratos relacionados y "Documentos y cronograma"
   (enriquecimiento con consulta cada 5 s).
4. ✅ **Contratos** (lista y detalle).
5. ✅ **Panel.** KPIs, serie temporal día/semana/mes, industrias, departamentos → municipios, top de
   entidades; clics que filtran y tabla "Ver datos" por gráfica.
6. ✅ **Buscar** (procesos y contratos juntos).
7. ✅ **Búsquedas guardadas.** Guardar desde los listados (409/422 en el diálogo), tarjetas con
   resumen legible, editar, pausar/reanudar, borrar con confirmación, `/busquedas/:id` con
   resultados e historial de alertas.
8. ✅ **Exportar** CSV (`Content-Disposition`, 422 con conteo, 429 con cuenta regresiva).
9. ✅ **Admin.** Ingesta (runs con autorefresco, lanzar run, checkpoints, scraping) y catálogos
   (alias de ubicaciones, mapeos UNSPSC, recarga DIVIPOLA).
10. ✅ **Pulido.** axe sin violaciones en Panel, Licitaciones y Detalle; ECharts y MSW diferidos;
    tema de login de Keycloak (`keycloak-theme/`).
