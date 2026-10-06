/**
 * Formatos `es-CO` puros (sin Angular) para pipes, gráficas y CSV. Moneda en COP sin
 * decimales (`$ 17.500.000`) y fechas en America/Bogota (UTC-5 fijo).
 */

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

const compactFormatter = new Intl.NumberFormat('es-CO', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** `$ 17.500.000`. Con espacio normal (Intl usa uno de no separación). */
export function formatCop(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return copFormatter.format(value).replace(/\u00a0/g, ' ');
}

/** `$ 1,2 mil M` para ejes y KPIs grandes. */
export function formatCopCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `$ ${compactFormatter.format(value).replace(/\u00a0/g, ' ')}`;
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return numberFormatter.format(value);
}

const DAY_MS = 24 * 60 * 60 * 1000;
const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;

/** Día calendario en Bogotá como número de días desde la época. */
function bogotaDay(epochMs: number): number {
  return Math.floor((epochMs + BOGOTA_OFFSET_MS) / DAY_MS);
}

/**
 * "Cierra hoy", "Cierra mañana", "Cierra en 3 días" o "Cerró" según el día calendario en
 * Bogotá. `null` si no hay fecha. No decide si un proceso está vigente: eso lo dice el backend.
 */
export function relativeDeadline(deadline: string | null | undefined, now: number): string | null {
  if (!deadline) return null;
  const time = Date.parse(deadline);
  if (Number.isNaN(time)) return null;
  if (time <= now) return 'Cerró';
  const days = bogotaDay(time) - bogotaDay(now);
  if (days === 0) {
    const hours = Math.ceil((time - now) / (60 * 60 * 1000));
    return hours <= 1 ? 'Cierra en menos de 1 hora' : `Cierra hoy, en ${hours} h`;
  }
  if (days === 1) return 'Cierra mañana';
  return `Cierra en ${days} días`;
}

/** Tono del badge de cierre: urgente si quedan menos de 3 días. */
export function deadlineUrgent(deadline: string | null | undefined, now: number): boolean {
  if (!deadline) return false;
  const time = Date.parse(deadline);
  return !Number.isNaN(time) && time > now && time - now < 3 * DAY_MS;
}
