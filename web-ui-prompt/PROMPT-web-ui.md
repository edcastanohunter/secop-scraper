# Prompt — Web UI de SecopScrapper (Angular 21+ · TypeScript · Tailwind · keycloak-js)

> Copia todo lo que hay debajo de la línea en un agente de código (por ejemplo, Claude Code) abierto en una carpeta **vacía** donde se creará el frontend (por ejemplo `C:\_ws\Projects\SecopScraper\secopscrapper-web`).
> El contrato de la API sale de las specs `SecopScrapper/specs/01…08`. Si existe `SecopScrapper/docs/openapi/secopscrapper.json`, ese archivo manda sobre lo escrito aquí.

---

## Rol y objetivo

Actúa como un ingeniero frontend senior experto en Angular moderno, accesibilidad y UX para productos de datos. Construye **"SECOP Radar"**, la Web UI de la API **SecopScrapper**: una plataforma que ingesta los contratos y procesos de compra pública de Colombia (SECOP I y SECOP II, vía datos.gov.co), los normaliza por **municipio (código DIVIPOLA)** e **industria (UNSPSC → industria amigable)** y los expone para buscarlos, filtrarlos, verlos en estadísticas, exportarlos y recibir alertas.

El usuario objetivo es una pyme o un proveedor colombiano que quiere encontrar **licitaciones vigentes** de su sector (por ejemplo "Desarrollo de Software", "Papelería" u "Obra Civil") en sus municipios (por ejemplo Cajicá, Chía, Bogotá o Cundinamarca).

Todo el texto visible va en **español de Colombia**. Los formatos son `es-CO`: moneda `COP` sin decimales, por ejemplo `$ 17.500.000`, y fechas `dd/MM/yyyy` en zona `America/Bogota`.

## Stack obligatorio

- **Angular 21+**:
  - componentes standalone;
  - **signals** (`signal`, `computed`, `effect`, `linkedSignal`) para el estado;
  - **zoneless** (`provideZonelessChangeDetection`);
  - control flow nativo (`@if`, `@for`, `@defer`);
  - `inject()` en vez de constructores;
  - `httpResource()` / `resource()` para las lecturas HTTP cuando encajen.
- **TypeScript** en modo `strict`, sin `any` implícito.
- **Tailwind CSS v4**, con un diseño propio, sobrio y profesional. Modo claro y oscuro (`prefers-color-scheme` más un interruptor manual guardado en `localStorage`).
- **keycloak-js** (última versión) con **Authorization Code + PKCE (S256)**. Integra con `provideKeycloak` de `keycloak-angular` si es compatible con Angular 21. Si no, usa un servicio propio sobre `keycloak-js` más un `HttpInterceptorFn` que añada `Authorization: Bearer` y refresque el token con `updateToken(30)`.
- **Gráficas:** Apache ECharts con `ngx-echarts`, cargadas con `@defer`.
- **Cliente HTTP tipado** generado desde OpenAPI con `openapi-typescript` (solo tipos) y una capa fina de servicios propios. Añade el script `npm run gen:api`, que lee `../SecopScrapper/docs/openapi/secopscrapper.json`.
- **Tests:** el runner unitario por defecto de Angular 21 (Vitest) y **Playwright** para e2e.
- **Mocks:** **MSW (Mock Service Worker)** activable con `ng serve --configuration=mock`, para trabajar sin backend. Usa fixtures realistas de procesos de Cajicá, Chía, Bogotá y Medellín en industrias variadas.
- **Lint y formato:** ESLint (`angular-eslint`) y Prettier.

## Configuración de entorno

```ts
// src/environments/environment.ts
export const environment = {
  apiBaseUrl: 'http://localhost:5146',
  keycloak: {
    url: 'http://localhost:8080',
    realm: 'secopscrapper',
    clientId: 'secopscrapper-web', // cliente público con PKCE (SPEC 05)
  },
};
```

La app corre en `http://localhost:4200`, que ya está permitido en CORS y en los redirect URIs de Keycloak.

## Autenticación y autorización

- **Todas las rutas de la API exigen token** (excepto `GET /alerts/unsubscribe`). La app arranca con `onLoad: 'login-required'`, salvo la página pública `/acerca-de-los-datos`, que se sirve sin login (usa `check-sso` con `silent-check-sso.html`).
- Hay registro abierto en Keycloak. Muestra "Crear cuenta" (`keycloak.register()`) en la pantalla de bienvenida.
- **Roles** (en `realm_access.roles` del token):
  - `procurement:read`: base para leer y buscar.
  - `procurement:export`: exportar a CSV.
  - `alerts:manage`: búsquedas guardadas.
  - `catalog:read` / `catalog:write`: catálogos y su administración.
  - `ingestion:run`: panel de ingesta y scraping.
- Crea la directiva estructural `*appHasRole="'procurement:export'"` y el guard `roleGuard('ingestion:run')`. Oculta las acciones sin permiso, no las deshabilites en silencio.
- Menú de usuario: nombre, email, "Mi cuenta" (`keycloak.accountManagement()`) y "Cerrar sesión".

## Contrato de la API (resumen; los tipos reales salen del OpenAPI)

Los enums viajan como cadenas `snake_case`.

### Catálogos (SPEC 01)

- `GET /catalog/departments` → `{ code, name }[]`
- `GET /catalog/municipalities?departmentCode=25&q=caj` → `{ divipolaCode, name, departmentCode, departmentName }[]`
- `GET /catalog/industries` → `{ id, name, description, prefixes[] }[]`. Ids de ejemplo: `software`, `logistica`, `papeleria`, `obra-civil`, `consultoria`, `salud`, `alimentos`, `aseo-cafeteria`, `seguridad`, `educacion`, `vehiculos`, `comunicaciones`, `otros`.
- Admin (`catalog:write`):
  - `GET /catalog/unresolved-locations?page&pageSize`
  - `POST /catalog/location-aliases { departmentRaw?, municipalityRaw, divipolaCode }`
  - `PUT /catalog/industry-mappings/{prefix} { industryId }`
  - `DELETE /catalog/industry-mappings/{prefix}`
  - `POST /catalog/divipola/refresh`

### Búsqueda (SPEC 05)

- `GET /search` → `SearchPage<OpportunityItem>`. Búsqueda cruzada de procesos y contratos (`kind: 'process' | 'contract'`).
- `GET /processes` → `SearchPage<ProcessSummary>`. `GET /processes/{source}/{sourceId}` → `ProcessDetail` (incluye `contracts[]` y `enrichment?`).
- `GET /contracts` → `SearchPage<ContractSummary>`. `GET /contracts/{source}/{sourceId}` → `ContractDetail`.
- `GET /processes/export` y `GET /contracts/export` → CSV (`procurement:export`). Respetan los mismos filtros. 422 `Export.TooManyRows` si pasan de 50.000 filas.
- `GET /meta/freshness` → `{ lastSyncedAt: Record<datasetKey, string | null> }`.
- **Filtros** (query string; los repetibles van como `?industry=a&industry=b`):

| Filtro                   | Valores                                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `q`                      | Texto, sintaxis web: `"frase"`, `-excluir`, `OR`                                                                                                                 |
| `industry[]`             | Ids del catálogo                                                                                                                                                 |
| `department[]`           | 2 dígitos                                                                                                                                                        |
| `municipality[]`         | DIVIPOLA de 5 dígitos                                                                                                                                            |
| `entity`                 | Texto                                                                                                                                                            |
| `source`                 | `secop1` \| `secop2`                                                                                                                                             |
| `status[]`               | Procesos: `open`, `evaluation`, `awarded`, `closed`, `cancelled`, `unknown`. Contratos: `signed`, `in_progress`, `suspended`, `finished`, `cancelled`, `unknown` |
| `onlyActive`             | bool                                                                                                                                                             |
| `competitiveOnly`        | bool, por defecto `true` en procesos                                                                                                                             |
| `modality[]`             | Valor original de la modalidad                                                                                                                                   |
| `minAmount`, `maxAmount` | Decimal ≥ 0                                                                                                                                                      |
| `dateFrom`, `dateTo`     | `yyyy-MM-dd`                                                                                                                                                     |
| `sort`                   | `relevance` \| `date_desc` \| `date_asc` \| `amount_desc` \| `amount_asc` \| `deadline_asc`                                                                      |
| `page`, `pageSize`       | `pageSize ≤ 100` y `page × pageSize ≤ 10.000`                                                                                                                    |

- **`SearchPage<T>`** = `{ items, page, pageSize, totalCount, totalCountIsCapped, attribution: { text, license, licenseUrl }, freshness: { lastSyncedAt } }`.
- **`ProcessSummary`** = `{ source, sourceId, reference?, title, entityName, location: { divipolaCode?, municipalityName?, departmentCode?, departmentName?, municipalityRaw?, departmentRaw? }, industries: { id, name }[], status, isActive, isCompetitive, modality?, basePrice?, publishedAt?, offersDeadlineAt?, awarded, awardedValue?, url? }`.
- **`ContractSummary`** = `{ source, sourceId, reference?, description, entityName, location, industries, status, modality?, signedAt?, startsAt?, endsAt?, value?, paidValue?, supplierName?, supplierNit?, supplierIsSme?, url? }`.
- **"Vigente"** (`isActive`) = abierto, no adjudicado, competitivo y con fecha de cierre futura. El backend lo calcula y la UI nunca lo recalcula.

### Estadísticas (SPEC 06)

Todas aceptan los filtros anteriores excepto `q`, `entity`, montos y `sort`, más `kind=processes|contracts`.

- `GET /stats/summary` → `{ count, totalAmount, awardedCount?, totalAwarded?, activeCount? }`
- `GET /stats/timeseries?interval=day|week|month&dateFrom&dateTo` (obligatorias, máximo 3 años) → `{ periodStart, count, totalAmount }[]`
- `GET /stats/by-industry` → `{ industryId, industryName, count, totalAmount }[]`
- `GET /stats/by-location?level=department|municipality` → `{ code, name, count, totalAmount }[]`. `municipality` exige `department`.
- `GET /stats/top-entities?limit=10` → `{ entityName, entityNit, count, totalAmount }[]`
- `GET /stats/facets` → `{ industries, departments, statuses, sources }`, cada uno `{ value, label, count }[]`. Cada facet ignora su propio filtro.

### Enriquecimiento por scraping (SPEC 07, opcional, puede estar apagado)

- `POST /processes/secop2/{sourceId}/enrichment` → 202. 503 `Scraping.Disabled` o `Scraping.HostBlocked` (`blockedUntil`). 409 si ya está corriendo.
- `GET /processes/secop2/{sourceId}/enrichment` → `{ status: pending|running|succeeded|failed|blocked|skipped, completedAt?, offersDeadlineAt?, documents: { name, url, publishedAt? }[], schedule: { milestone, date }[], error? }`.
- `GET /scraping/status` (`ingestion:run`).

### Búsquedas guardadas y alertas (SPEC 08)

- `GET /saved-searches` y `POST /saved-searches { name, kind: 'processes'|'contracts', filters, frequency: 'none'|'daily'|'weekly' }`. 422 `SavedSearch.LimitReached` (máximo 20). 409 si el nombre está repetido.
- `GET`, `PUT` y `DELETE /saved-searches/{id}`. `POST /saved-searches/{id}/pause` y `POST /saved-searches/{id}/resume`.
- `GET /saved-searches/{id}/results?page&pageSize&sort` → `SearchPage<…>`.
- `GET /saved-searches/{id}/deliveries` → `PagedList<{ id, windowFrom, windowTo, matches, included, status: queued|sent|failed, error?, createdAt, sentAt? }>`.
- `SavedSearchResponse` = `{ id, name, kind, filters, frequency, isPaused, lastAlertAt?, createdAt, newSinceLastAlert }`.
- Los emails de alerta enlazan a **`/busquedas/{id}`**. Esa ruta **debe existir**.

### Ingesta (SPEC 02/04, `ingestion:run`)

- `POST /ingestion/runs { datasetKey, mode, from?, to? }` → 202 `{ runId }`. 409 si ya hay uno activo.
  - `datasetKey`: `secop2-processes` | `secop2-contracts` | `secop1-processes`.
  - `mode`: `backfill` | `incremental` | `reconcile` | `refresh-open` (este último solo para `secop2-processes`).
- `GET /ingestion/runs?datasetKey&status&page&pageSize` y `GET /ingestion/runs/{id}` → `{ id, datasetKey, mode, status: queued|running|succeeded|failed|cancelled, windowFrom?, windowTo?, pages, rowsRead, rowsInserted, rowsUpdated, rowsUnchanged, rowsRejected, error?, requestedBy, queuedAt, startedAt?, finishedAt? }`.
- `GET /ingestion/checkpoints` → `{ datasetKey, watermark?, backfillCompletedAt?, lastSuccessAt? }[]`.

### Errores

Todos los errores son **ProblemDetails** (`application/problem+json`), con `title`, `status`, `detail` y `errors` (validación, por campo). Un 429 trae `Retry-After`.

## Mapa de pantallas (rutas)

| Ruta                              | Pantalla                                                                                                       | Rol                |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------ |
| `/`                               | **Panel**: KPIs, serie temporal, industrias, departamentos y top entidades, con la barra de filtros compartida | `procurement:read` |
| `/licitaciones`                   | **Licitaciones** (procesos) con `onlyActive=true` y `competitiveOnly=true` por defecto                         | `procurement:read` |
| `/licitaciones/:source/:sourceId` | Detalle de proceso                                                                                             | `procurement:read` |
| `/contratos`                      | **Contratos**                                                                                                  | `procurement:read` |
| `/contratos/:source/:sourceId`    | Detalle de contrato                                                                                            | `procurement:read` |
| `/buscar`                         | Búsqueda global (`/search`) con resultados mixtos marcados "Proceso"/"Contrato"                                | `procurement:read` |
| `/busquedas`                      | Mis búsquedas guardadas                                                                                        | `alerts:manage`    |
| `/busquedas/:id`                  | Resultados de una búsqueda guardada más el historial de envíos                                                 | `alerts:manage`    |
| `/admin/ingesta`                  | Runs, checkpoints, lanzar un run y estado del scraping                                                         | `ingestion:run`    |
| `/admin/catalogos`                | Ubicaciones sin resolver → crear alias. Mapeos UNSPSC → industria                                              | `catalog:write`    |
| `/acerca-de-los-datos`            | Fuente, licencia CC BY-SA 4.0, frecuencia, qué significa "vigente", privacidad y limitaciones                  | Pública            |
| `**`                              | 404 amable                                                                                                     | —                  |

Cada ruta se carga en diferido (`loadComponent`).

## Requisitos funcionales clave

1. **Barra de filtros compartida** (`FilterBarComponent`), usada en el Panel, Licitaciones, Contratos y Buscar. Incluye:
   - un buscador de texto con debounce de 400 ms;
   - multiselección de **industrias** con chips y conteos de `/stats/facets`;
   - **ubicación jerárquica**: departamento → municipios, con autocompletar contra `/catalog/municipalities?q=` y chips del tipo "Cajicá (Cundinamarca)";
   - estado, fuente, modalidad, rango de montos (en COP, con máscara) y rango de fechas;
   - los interruptores "Solo vigentes" y "Solo competitivos".

   **El estado de los filtros vive en la URL** (query params). Recargar o compartir el enlace reproduce la búsqueda. Usa `withComponentInputBinding()` y un `FilterStateService` basado en signals.

2. **Listados** en tabla en escritorio y tarjetas en móvil (< 768 px):
   - Columnas: título, entidad, municipio, industrias (chips), monto, fecha y estado.
   - Un **badge "Vigente"** con la cuenta regresiva hasta el cierre ("Cierra en 3 días") cuando `isActive`.
   - Paginación (tamaños 20, 50 y 100) y orden.
   - Si `totalCountIsCapped`, muestra "Más de 10.000 resultados, afina los filtros".
3. **Detalle** con todos los campos:
   - El dato de ubicación original (`municipalityRaw`) se muestra junto al normalizado ("Fuente: «BOGOTA D.C.»").
   - Botón "Ver en SECOP" (`url`, en una pestaña nueva con `rel="noopener noreferrer"`).
   - Contratos relacionados.
   - Si el proceso es `secop2`, una sección **"Documentos y cronograma"** con el botón "Obtener del portal SECOP". El botón llama al endpoint de enriquecimiento y consulta su estado cada 5 s hasta un estado final. Muestra mensajes claros para `Scraping.Disabled` ("Función no disponible") y `HostBlocked` ("El portal SECOP limitó el acceso; inténtalo después de <hora>").
4. **Panel** con:
   - KPIs (conteo, monto total, vigentes, adjudicados);
   - serie temporal con un selector día/semana/mes;
   - barras horizontales por industria;
   - barras por departamento, que al hacer clic bajan a municipios de ese departamento;
   - la tabla de top entidades.

   Los clics en las gráficas aplican el filtro correspondiente. Las fechas por defecto son los últimos 12 meses.

5. **Guardar búsqueda**: desde cualquier listado, el botón "Guardar búsqueda" abre un diálogo con nombre y frecuencia (Nunca / Diaria / Semanal) y guarda los filtros actuales. Gestiona los errores 422 (límite) y 409 (nombre repetido) en el diálogo.
6. **Mis búsquedas**: tarjetas con nombre, resumen legible de filtros ("Software · Cajicá, Chía · Solo vigentes"), frecuencia, último envío y el badge `newSinceLastAlert`. Acciones: ver resultados, editar, pausar o reanudar, y borrar con confirmación. En `/busquedas/:id`, una pestaña "Historial de alertas".
7. **Exportar CSV** (solo con `procurement:export`): descarga con `HttpClient` (`responseType: 'blob'`) y el nombre de `Content-Disposition`. Si llega 422 `TooManyRows`, muestra el conteo y sugiere filtrar. Si llega 429, muestra cuándo se puede reintentar.
8. **Atribución y frescura, siempre visibles**:
   - Pie global: "Fuente: Colombia Compra Eficiente – SECOP, vía datos.gov.co · Licencia CC BY-SA 4.0" con enlace a la licencia y a `/acerca-de-los-datos`.
   - Cada listado y el panel muestran "Datos actualizados al <fecha>" según `freshness`. Si un dataset tiene más de 36 h de antigüedad, se muestra un aviso discreto.
9. **Admin de ingesta**:
   - Tabla de runs con autorefresco cada 10 s mientras haya alguno `running`.
   - Barra de progreso (filas leídas, páginas) y formulario para lanzar un run, que valida que `refresh-open` solo aplica a `secop2-processes`.
   - Tarjetas de checkpoints y del estado del scraping.
10. **Admin de catálogos**:
    - Tabla de ubicaciones sin resolver ordenada por ocurrencias, con la acción "Asignar municipio" (autocompletar DIVIPOLA) que crea el alias.
    - Editor de mapeos UNSPSC → industria con validación del prefijo (`^\d{2}(\d{2}){0,3}$`).
    - Un aviso de que la reclasificación tarda hasta 15 minutos.

## Estados y UX obligatorios

- **Carga:** skeletons, no spinners a pantalla completa. **Vacío:** ilustración ligera y sugerencias ("Quita el filtro de municipio", "Desactiva Solo vigentes"). **Error:** mensaje humano a partir de ProblemDetails, botón Reintentar y `traceId` copiable si viene.
- **401:** reautentica con Keycloak. **403:** página "No tienes permiso". **429:** toast con la cuenta regresiva de `Retry-After`.
- Los errores de validación del backend (`errors`) se muestran en el campo correspondiente del formulario.
- **Accesibilidad WCAG 2.2 AA:**
  - navegación completa por teclado y foco visible;
  - `aria-live` para los resultados actualizados;
  - contraste verificado;
  - las gráficas tienen tabla alternativa ("Ver datos").
- **Rendimiento:**
  - `@defer` para gráficas y paneles bajo el pliegue;
  - presupuesto del bundle inicial < 250 kB gzip;
  - virtual scroll (`@angular/cdk/scrolling`) si se muestran más de 100 filas.
- **Responsive** desde 360 px. En móvil la barra de filtros va en un panel lateral (drawer) con contador de filtros activos.

## Arquitectura del código

```
src/app/
  core/          auth (keycloak, interceptor, guards, has-role), http (error interceptor, problem-details), config, layout (shell, header, footer)
  api/           tipos generados (openapi-typescript) + servicios por recurso (catalog, processes, contracts, search, stats, saved-searches, ingestion, enrichment)
  shared/        ui (chips, badge-vigente, money, date, empty-state, skeleton, data-table, pagination), pipes (cop-currency, relative-deadline), utils (filters <-> query params)
  features/
    dashboard/  processes/  contracts/  search/  saved-searches/  admin/  about/
  mocks/         handlers MSW + fixtures
```

- Hay un servicio por recurso, que devuelve `httpResource`/`Observable` tipados. No se llama a `HttpClient` desde los componentes.
- Las funciones de serialización de filtros ↔ query params son puras y tienen tests unitarios.
- No uses NgRx. Bastan signals y servicios. Justifícalo en el README.

## Entregables y criterios de aceptación

- [ ] `npm start` levanta la app en `http://localhost:4200` contra la API real. `npm run start:mock` la levanta con MSW sin backend.
- [ ] `npm run gen:api` regenera los tipos desde el OpenAPI sin errores de compilación.
- [ ] Login y registro funcionan con Keycloak (PKCE). El token se adjunta y se refresca solo.
- [ ] En `/licitaciones`, filtrar por **Industria = Desarrollo de Software** y **Municipio = Cajicá** produce `GET /processes?industry=software&municipality=25126&onlyActive=true&competitiveOnly=true&…` y el resultado se refleja en la URL.
- [ ] Recargar la página con esa URL restaura exactamente los mismos filtros y resultados.
- [ ] Los facets muestran conteos y cambian al aplicar otros filtros.
- [ ] Un usuario sin `procurement:export` no ve el botón Exportar. Uno con el permiso descarga un `.csv`.
- [ ] Guardar una búsqueda y abrir `/busquedas/{id}` muestra los mismos resultados que el listado original.
- [ ] El pie con la atribución CC BY-SA 4.0 y "Datos actualizados al…" aparece en todas las pantallas autenticadas.
- [ ] `/admin/*` no es accesible sin los roles correspondientes (guard + 403).
- [ ] Sin errores de axe (Playwright + `@axe-core/playwright`) en Panel, Licitaciones y Detalle.
- [ ] Tests unitarios de los servicios, pipes y la serialización de filtros. Tests e2e (Playwright, en modo mock) para: buscar y filtrar, ver un detalle, guardar una búsqueda y exportar.
- [ ] `README.md` con la configuración, los scripts, la arquitectura y las decisiones (por qué signals sin NgRx, por qué ECharts, por qué MSW).

## Restricciones

- No inventes endpoints ni campos. Si el OpenAPI difiere de este prompt, **gana el OpenAPI**. Anota la diferencia en el README.
- No recalcules en el cliente lógica de negocio que da el backend: "vigente", normalización de municipios o clasificación por industria.
- No guardes tokens en `localStorage`. keycloak-js los mantiene en memoria.
- No muestres ni pidas datos personales más allá de lo que entrega la API.
- Trabaja por incrementos que se puedan verificar: shell y auth → catálogos y barra de filtros → licitaciones (lista y detalle) → contratos → panel → buscar → búsquedas guardadas → exportar → admin → pulido de accesibilidad y rendimiento. Al terminar cada incremento, ejecuta lint y tests y muéstrame un resumen antes de seguir.
