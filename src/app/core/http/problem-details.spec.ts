import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { exportRowCount, fieldErrorsFor, problemMessage, toProblem } from './problem-details';

function httpError(status: number, error: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error, headers: new HttpHeaders() });
}

describe('toProblem', () => {
  it('lee el formato de CustomResults: errorCode y errors como lista', () => {
    const problem = toProblem(
      httpError(400, {
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
        title: 'Validation failed',
        status: 400,
        detail: 'One or more validation errors occurred',
        errorCode: 'General.Validation',
        traceId: '00-abc-01',
        errors: [{ code: 'Name.Required', description: 'El nombre es obligatorio.' }],
      }),
    );

    expect(problem.status).toBe(400);
    expect(problem.errorCode).toBe('General.Validation');
    expect(problem.traceId).toBe('00-abc-01');
    expect(problem.issues).toEqual([
      { code: 'Name.Required', description: 'El nombre es obligatorio.' },
    ]);
    expect(problem.fieldErrors).toEqual({});
  });

  it('lee el formato ASP.NET de errores por campo', () => {
    const problem = toProblem(
      httpError(400, { title: 'Bad', errors: { pageSize: ['Máximo 100.'], q: 'Muy largo.' } }),
    );

    expect(problem.fieldErrors).toEqual({ pageSize: ['Máximo 100.'], q: ['Muy largo.'] });
  });

  it('conserva las extensiones desconocidas', () => {
    const problem = toProblem(
      httpError(503, {
        title: 'Unavailable',
        errorCode: 'Scraping.HostBlocked',
        blockedUntil: '2026-10-04T23:00:00Z',
      }),
    );

    expect(problem.extensions).toEqual({ blockedUntil: '2026-10-04T23:00:00Z' });
  });

  it('acepta el cuerpo como texto JSON (respuestas blob/text)', () => {
    const problem = toProblem(
      httpError(422, JSON.stringify({ title: 'Too many', errorCode: 'Export.TooManyRows' })),
    );

    expect(problem.errorCode).toBe('Export.TooManyRows');
    expect(problem.status).toBe(422);
  });

  it('sin cuerpo usa el estado HTTP y un título por defecto', () => {
    const problem = toProblem(httpError(0, new ProgressEvent('error')));

    expect(problem).toMatchObject({ status: 0, title: 'Sin conexión', issues: [] });
  });
});

describe('problemMessage', () => {
  it.each([
    [0, 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'],
    [403, 'No tienes permiso para realizar esta acción.'],
    [500, 'Algo falló en el servidor. Inténtalo de nuevo en unos minutos.'],
  ])('status %i da un mensaje humano', (status, expected) => {
    expect(problemMessage(toProblem(httpError(status, null)))).toBe(expected);
  });

  it('en 409/422 usa el detail del servidor', () => {
    const problem = toProblem(httpError(409, { detail: 'Ya existe una búsqueda con ese nombre.' }));
    expect(problemMessage(problem)).toBe('Ya existe una búsqueda con ese nombre.');
  });
});

describe('códigos de dominio', () => {
  it('traduce los errorCode conocidos en vez de mostrar el detail en inglés', () => {
    const problem = toProblem(
      httpError(409, {
        errorCode: 'SavedSearch.NameTaken',
        detail: 'Another saved search of the current user already has that name.',
      }),
    );
    expect(problemMessage(problem)).toBe(
      'Ya tienes una búsqueda guardada con ese nombre. Elige otro.',
    );
  });

  it('exportRowCount lee el conteo de Export.TooManyRows', () => {
    const problem = toProblem(
      httpError(422, {
        errorCode: 'Export.TooManyRows',
        detail:
          'The filters match 61234 rows and an export holds at most 50000. Narrow the filters.',
      }),
    );
    expect(exportRowCount(problem)).toBe(61234);
    expect(exportRowCount(toProblem(httpError(422, {})))).toBeNull();
  });
});

describe('fieldErrorsFor', () => {
  it('encuentra errores por clave del mapa sin distinguir mayúsculas', () => {
    const problem = toProblem(httpError(400, { errors: { Name: ['Obligatorio.'] } }));
    expect(fieldErrorsFor(problem, 'name')).toEqual(['Obligatorio.']);
  });

  it('encuentra errores por prefijo de código en la lista', () => {
    const problem = toProblem(
      httpError(400, {
        errors: [
          { code: 'Name.TooLong', description: 'Máximo 100 caracteres.' },
          { code: 'Frequency', description: 'Frecuencia inválida.' },
          { code: 'NameOther', description: 'No debe coincidir.' },
        ],
      }),
    );

    expect(fieldErrorsFor(problem, 'name')).toEqual(['Máximo 100 caracteres.']);
    expect(fieldErrorsFor(problem, 'frequency')).toEqual(['Frecuencia inválida.']);
  });
});
