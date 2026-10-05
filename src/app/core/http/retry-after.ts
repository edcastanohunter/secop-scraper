/**
 * Segundos que hay que esperar según la cabecera `Retry-After` (RFC 9110 §10.2.3), que puede
 * traer un entero de segundos o una fecha HTTP. Devuelve `null` si falta o no se entiende.
 */
export function parseRetryAfter(header: string | null, now: number): number | null {
  if (header === null) return null;
  const value = header.trim();
  if (value === '') return null;

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  // Una fecha HTTP siempre lleva el nombre del día o del mes; así se descartan cosas
  // como "-5", que `Date.parse` aceptaría como el año -5.
  if (!/[a-z]/i.test(value)) return null;
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.ceil((date - now) / 1000));
}
