# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**SECOP Radar**: Angular 21 web UI for the SecopScrapper API (Colombian public procurement, SECOP I/II,
normalized by municipality/DIVIPOLA and industry/UNSPSC). Stack: standalone components, signals, zoneless,
strict TS, Tailwind v4, Keycloak (PKCE S256 via `keycloak-angular`), MSW, Vitest, Playwright + axe.

The original build spec is `web-ui-prompt/PROMPT-web-ui.md` (routes, functional requirements, UX states,
acceptance criteria, constraints). README "Estado por incrementos" tracks progress (all 10 done) and
README "Diferencias OpenAPI vs prompt" records every contract quirk.

All user-visible text is **Colombian Spanish**; code comments and test names are also in Spanish. Locale
`es-CO`, currency `COP`, dates `dd/MM/yyyy` at fixed `-0500` (set globally in `app.config.ts`).

Node ≥ 22.12 or ≥ 24. Stay on Angular 21 (Angular 22 needs Node ≥ 24.15).

## Commands

- `npm start`: dev server on :4200 against real API (`http://localhost:5146`) and Keycloak (`:8080`, realm `secopscrapper`, client `secopscrapper-web`).
- `npm run start:mock`: same, with MSW answering the API and a fake session (no backend needed). Use this for local work.
- `npm run build`: production build to `dist/secop-radar` (budgets: initial 700 kB warn / 850 kB error raw ≈ 250 kB gzip target).
- `npm test`: Vitest via `@angular/build:unit-test`, single run. Single file: `npx ng test --watch=false --include src/app/core/auth/role.guard.spec.ts`. Watch: `npm run test:watch`.
- `npm run e2e`: Playwright against `start:mock` (auto-starts it). Projects `desktop` and `mobile`. Single test: `npx playwright test e2e/shell.spec.ts --project=desktop -g "<name>"`. Uses installed Chrome by default; `PW_CHANNEL=chromium` for Playwright's browser.
- `npm run lint`: angular-eslint incl. template accessibility rules. `npm run format` / `format:check`: Prettier (100 cols, single quotes).
- `npm run gen:api`: `scripts/gen-api.mjs` generates `src/app/api/generated/schema.d.ts` from `SecopScrapper_V1.json` (repo root; `-- --from <path>` for another copy), mapping .NET's `integer|string` numbers to `number`. The generated file is committed and lint-ignored.

Per the spec, run lint and tests at the end of each increment.

## Architecture

- `core/`: app-wide singletons. auth, http (interceptors, ProblemDetails), config (`apiUrl()`, title strategy), layout (`Shell` wraps every route), theme, notifications (toasts).
- `api/`: one service per API resource. **Components never use `HttpClient` directly.** Reads are `httpResource()` factories (call them in an injection context; return `undefined` to stay idle); writes return Observables. URLs via `apiUrl('/path')`. `models.ts` is the only importer of `generated/`: it aliases schemas and overrides what the OpenAPI gets wrong. ASP.NET collapsed every nested `record Request` into one `{title, description}` schema, so real request bodies are hand-typed from the backend's `Endpoints/**`. Enums are typed as literal unions, and saved-search results are a union.
- Filters: `shared/utils/filters.ts` (pure, tested) converts URL ↔ API params per endpoint (`toApiParams(f, scope)`: contracts drop `onlyActive`/`competitiveOnly`, stats drop q/entity/amounts/sort). Pages add `providers: [provideFilters(scope)]` from `shared/filter-bar/filter-context.ts` and read `FilterStateService.filters()`. Route `data.filterDefaults` sets per-screen defaults.
- The backend writes ProblemDetails `detail` in English: add Spanish messages for new `errorCode`s in `core/http/problem-details.ts`.
- `features/`: one folder per screen, lazy-loaded with `loadComponent` in `app.routes.ts`.
- `shared/`: `ui/` reusable components, `utils/` pure functions with unit tests.
- `mocks/`: MSW `handlers.ts` + `query.ts` (filters/pages/aggregates fixtures like the API) + `db.ts` (in-memory state, reset on reload) + `fixtures/`. Every new endpoint needs a handler here, since both `start:mock` and e2e depend on it. Deterministic error triggers: `q=todo` (capped total / export 422), process `CO1.REQ.7009999` (503 HostBlocked), and a saved-search name containing "repetida" (409). In e2e, after mutating mock state navigate with in-app links (`navTo()`), not `page.goto`.
- `keycloak-theme/secop-radar`: Keycloak login theme (CSS + messages over `keycloak.v2`), mounted by the backend's docker-compose. Keep its `--sr-*` colors in sync with `src/styles.css`. `main.ts` starts the worker before bootstrap only when `environment.mock`; the worker file (`mock-public/`) is published only in the `mock` build config, which also swaps in `environment.mock.ts`.

### Auth

- `AuthService` (`core/auth/auth.service.ts`) is an abstract class with `KeycloakAuthService` and `MockAuthService`; `provideAuth()` picks one based on `environment.mock`. Code depends only on the abstraction. In tests, provide `src/testing/fake-auth.service.ts` (`{ provide: AuthService, useClass: FakeAuthService }`), which exposes writable `signedIn` / `grantedRoles` / `token` signals.
- Keycloak starts with `check-sso` so `/acerca-de-los-datos` stays public; every other route has `canActivate: [roleGuard('<role>')]`, which triggers login when there's no session and redirects to `/sin-permiso` without the role. Hide unauthorized UI with `*appHasRole`, don't just disable it. Roles are the typed `Role` union in `core/auth/roles.ts`.
- `authInterceptor` adds the bearer token only to `apiBaseUrl` requests, skipping public paths (`PUBLIC_API_PATHS` in `api-url.ts`, e.g. `/alerts/unsubscribe`). Tokens live in memory only; never put auth in `localStorage`.
- Mock-mode roles: `localStorage.setItem('secop-mock-roles', 'procurement:read')` then reload; e2e uses `useRoles()` from `e2e/fixtures.ts`.

### Errors

`errorInterceptor` handles globally 401 → login, 403 → `/sin-permiso`, 429 → countdown toast from `Retry-After`, then rethrows so each screen renders its own error state. Use `toProblem()`, `problemMessage()` and `fieldErrorsFor()` from `core/http/problem-details.ts`. The backend sends validation errors as `errors: { code, description }[]` (with `errorCode` extension for domain errors) and uses 400; the UI treats 400 and 422 the same.

### Constraints (from the spec)

- No NgRx: server state comes from `httpResource`, filter state lives in URL query params (`withComponentInputBinding()` is on).
- Don't invent endpoints or fields; if the OpenAPI differs from the prompt, the OpenAPI wins and the difference goes in the README table.
- Don't recompute backend business logic on the client ("vigente", municipality normalization, industry classification).
- Charts use ECharts via `ngx-echarts`, always inside `@defer`.
- Don't change the `busquedas/:id` route; alert emails link to it.
- Selectors: `app-` prefix (kebab-case elements, camelCase attribute directives).
