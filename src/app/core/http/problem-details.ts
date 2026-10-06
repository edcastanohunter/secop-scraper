import { HttpErrorResponse } from '@angular/common/http';

/** Elemento de `errors` tal como lo emite hoy la API (`CustomResults`): una lista, no un mapa. */
export interface ApiIssue {
  code: string;
  description: string;
}

/**
 * ProblemDetails (RFC 9457) normalizado. La API manda el código de dominio en la extensión
 * `errorCode` (`Export.TooManyRows`, `SavedSearch.LimitReached`…) y la validación como
 * `errors: { code, description }[]`; también se acepta el formato ASP.NET `errors: { campo: [] }`.
 */
export interface ProblemDetails {
  status: number;
  title: string;
  detail?: string;
  type?: string;
  instance?: string;
  errorCode?: string;
  traceId?: string;
  fieldErrors: Record<string, string[]>;
  issues: ApiIssue[];
  /** Extensiones restantes, p. ej. `blockedUntil` o el conteo de filas de un export. */
  extensions: Record<string, unknown>;
}

const KNOWN_KEYS = new Set([
  'status',
  'title',
  'detail',
  'type',
  'instance',
  'errorCode',
  'traceId',
  'errors',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseBody(body: unknown): Record<string, unknown> {
  if (isRecord(body)) return body;
  if (typeof body === 'string') {
    try {
      const parsed: unknown = JSON.parse(body);
      if (isRecord(parsed)) return parsed;
    } catch {
      // Texto plano: no es ProblemDetails.
    }
  }
  return {};
}

function readErrors(errors: unknown): Pick<ProblemDetails, 'fieldErrors' | 'issues'> {
  const fieldErrors: Record<string, string[]> = {};
  const issues: ApiIssue[] = [];

  if (Array.isArray(errors)) {
    for (const item of errors) {
      if (isRecord(item)) {
        issues.push({
          code: asString(item['code']) ?? '',
          description: asString(item['description']) ?? '',
        });
      }
    }
  } else if (isRecord(errors)) {
    for (const [field, messages] of Object.entries(errors)) {
      const list = Array.isArray(messages) ? messages : [messages];
      fieldErrors[field] = list.filter((m): m is string => typeof m === 'string');
    }
  }

  return { fieldErrors, issues };
}

/** Convierte cualquier error de `HttpClient` (o un cuerpo ya leído) en un ProblemDetails. */
export function toProblem(error: unknown, statusHint = 0): ProblemDetails {
  const status = error instanceof HttpErrorResponse ? error.status : statusHint;
  const body = parseBody(error instanceof HttpErrorResponse ? error.error : error);

  const extensions: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!KNOWN_KEYS.has(key)) extensions[key] = value;
  }

  const bodyStatus = body['status'];
  return {
    status: typeof bodyStatus === 'number' ? bodyStatus : status,
    title: asString(body['title']) ?? defaultTitle(status),
    detail: asString(body['detail']),
    type: asString(body['type']),
    instance: asString(body['instance']),
    errorCode: asString(body['errorCode']),
    traceId: asString(body['traceId']),
    ...readErrors(body['errors']),
    extensions,
  };
}

function defaultTitle(status: number): string {
  if (status === 0) return 'Sin conexión';
  if (status >= 500) return 'Error del servidor';
  return 'Error';
}

/**
 * Mensajes en español de los códigos de dominio que la UI conoce. El backend escribe `detail`
 * en inglés, así que solo se muestra tal cual cuando el código no está aquí.
 */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  'SavedSearch.NameTaken': 'Ya tienes una búsqueda guardada con ese nombre. Elige otro.',
  'SavedSearch.LimitReached':
    'Llegaste al máximo de búsquedas guardadas. Borra alguna para guardar esta.',
  'SavedSearch.VerifiedEmailRequired':
    'Las alertas llegan por email: verifica tu correo en "Mi cuenta" para activarlas.',
  'SavedSearch.NotFound': 'Esta búsqueda guardada no existe o no es tuya.',
  'SavedSearch.InvalidName': 'El nombre debe tener entre 1 y 100 caracteres.',
  'Export.TooManyRows': 'Hay demasiados resultados para exportar. Afina los filtros.',
  'Scraping.Disabled': 'Función no disponible por ahora.',
  'Scraping.HostBlocked': 'El portal SECOP limitó el acceso. Inténtalo más tarde.',
  'Scraping.AlreadyRunning': 'Ya estamos consultando el portal SECOP para este proceso.',
  'Ingestion.RunInProgress': 'Ya hay un run en cola o en curso para ese dataset.',
  'Procurement.ProcessNotFound': 'No encontramos este proceso.',
  'Procurement.ContractNotFound': 'No encontramos este contrato.',
  'Catalog.AliasExists': 'Esa escritura ya está asignada a un municipio.',
  'Catalog.MunicipalityNotFound': 'No existe un municipio con ese código DIVIPOLA.',
  'Catalog.MappingNotFound': 'No hay un mapeo para ese prefijo.',
};

/** Filas que tendría una exportación rechazada con `Export.TooManyRows`, si el detalle las trae. */
export function exportRowCount(problem: ProblemDetails): number | null {
  const match = /match (\d+) rows/i.exec(problem.detail ?? '');
  return match ? Number(match[1]) : null;
}

/** Mensaje para personas, en español, a partir del ProblemDetails. */
export function problemMessage(problem: ProblemDetails): string {
  const { status, detail, errorCode } = problem;
  const known = errorCode ? ERROR_CODE_MESSAGES[errorCode] : undefined;
  if (known) return known;
  if (status === 0) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }
  if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 404) return 'No encontramos lo que buscas.';
  if (status === 429) return 'Hiciste demasiadas solicitudes seguidas. Espera un momento.';
  if (status >= 500) return 'Algo falló en el servidor. Inténtalo de nuevo en unos minutos.';
  return detail ?? 'Revisa los datos e inténtalo de nuevo.';
}

/**
 * Mensajes de validación de un campo. Busca la clave en `errors` (sin distinguir mayúsculas)
 * y, en el formato de lista, los códigos `Campo` o `Campo.Algo`.
 */
export function fieldErrorsFor(problem: ProblemDetails, field: string): string[] {
  const wanted = field.toLowerCase();
  const fromMap = Object.entries(problem.fieldErrors)
    .filter(([key]) => key.toLowerCase() === wanted)
    .flatMap(([, messages]) => messages);
  const fromList = problem.issues
    .filter(({ code }) => {
      const lower = code.toLowerCase();
      return lower === wanted || lower.startsWith(`${wanted}.`);
    })
    .map(({ description }) => description);
  return [...fromMap, ...fromList];
}
