# SECOP Radar — Web UI de SecopScrapper

Interfaz web para buscar licitaciones vigentes y contratos públicos de Colombia (SECOP I y II),
normalizados por municipio (DIVIPOLA) e industria (UNSPSC). Consume la API **SecopScrapper**
(`../SecopScrapper`).

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

| Script               | Qué hace                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm start`          | `ng serve` en `http://localhost:4200` contra la API real y Keycloak.                                 |
| `npm run start:mock` | Igual, pero con MSW respondiendo la API y una sesión simulada (sin backend).                         |
| `npm run build`      | Build de producción en `dist/secop-radar`.                                                           |
| `npm test`           | Tests unitarios (Vitest, runner por defecto de Angular 21), una pasada.                              |
| `npm run test:watch` | Tests unitarios en modo watch.                                                                       |
| `npm run e2e`        | Playwright contra `start:mock` (lo levanta solo si no está corriendo).                               |
| `npm run lint`       | ESLint (`angular-eslint`, incluidas las reglas de accesibilidad de plantillas).                      |
| `npm run format`     | Prettier.                                                                                            |
| `npm run gen:api`    | Genera `src/app/api/generated/schema.d.ts` desde `../SecopScrapper/docs/openapi/secopscrapper.json`. |

### Modo mock

- El service worker de MSW (`mock-public/mockServiceWorker.js`) solo se publica en la configuración
  `mock`, no en producción.
- La sesión simulada tiene todos los roles. Para probar permisos, fija los roles en la consola del
  navegador y recarga: `localStorage.setItem('secop-mock-roles', 'procurement:read')`. Los e2e
  hacen lo mismo con `useRoles()` (`e2e/fixtures.ts`).

### E2E

Por defecto Playwright usa el Chrome instalado (`channel: 'chrome'`). En CI, o si prefieres el
navegador de Playwright: `npx playwright install chromium` y `PW_CHANNEL=chromium npm run e2e`.

## Arquitectura

```
src/app/
  core/       auth (keycloak, interceptor, roleGuard, *appHasRole), http (errores, ProblemDetails,
              Retry-After), config (URLs de API, títulos), layout (shell, header, footer),
              theme, notifications (toasts)
  api/        tipos y un servicio por recurso; los componentes nunca llaman a HttpClient
  shared/     ui (componentes reutilizables), utils (funciones puras con tests)
  features/   una carpeta por pantalla; cada ruta se carga en diferido (loadComponent)
  mocks/      handlers MSW + fixtures
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

### Errores

`errorInterceptor` reacciona de forma global: 401 lanza el login, 403 lleva a "No tienes permiso"
y 429 muestra un toast con la cuenta regresiva de `Retry-After`. El error se propaga para que
cada pantalla muestre su estado. `toProblem()` normaliza el ProblemDetails, `problemMessage()`
lo traduce a un mensaje humano y `fieldErrorsFor()` reparte los errores de validación por campo.

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
  aproximadamente ese gzip. Tras el incremento 1, el inicial pesa ~98 kB gzip.
- **Fechas.** `es-CO` y zona `-0500` (America/Bogota no tiene horario de verano) en
  `DATE_PIPE_DEFAULT_OPTIONS`.

## Diferencias con el prompt original

`docs/openapi/secopscrapper.json` todavía no existe. Los tipos de `src/app/api/*.models.ts` están
escritos a mano a partir de las SPECs. Cuando la API publique el OpenAPI, `npm run gen:api` los
reemplaza y el OpenAPI manda. Diferencias detectadas leyendo el backend:

| Tema                                               | Prompt             | API real (`CustomResults.cs`)                                                                              | Cómo lo trata la UI                                                                    |
| -------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Código de error de dominio (`Export.TooManyRows`…) | Sin especificar    | Extensión `errorCode` del ProblemDetails                                                                   | `ProblemDetails.errorCode`                                                             |
| Errores de validación                              | `errors` por campo | `errors: { code, description }[]`, con `code` = `ErrorCode` o el nombre de la propiedad (FluentValidation) | Se aceptan ambos formatos; `fieldErrorsFor()` asocia por clave o por prefijo de código |
| Validación                                         | No dice el estado  | 400 (`ErrorType.Validation`)                                                                               | Se trata 400 y 422 igual                                                               |

## Estado por incrementos

1. ✅ **Shell y auth.** Proyecto, Tailwind con tema claro/oscuro, Keycloak con PKCE, interceptores,
   `roleGuard`, `*appHasRole`, layout accesible (skip link, menú de usuario, nav responsive), pie
   con atribución y frescura, toasts, páginas Acerca de, 404 y 403, MSW y e2e de humo con axe.
2. ⏳ Catálogos y barra de filtros.
3. ⏳ Licitaciones (lista y detalle).
4. ⏳ Contratos.
5. ⏳ Panel.
6. ⏳ Buscar.
7. ⏳ Búsquedas guardadas.
8. ⏳ Exportar.
9. ⏳ Admin.
10. ⏳ Pulido de accesibilidad y rendimiento.
