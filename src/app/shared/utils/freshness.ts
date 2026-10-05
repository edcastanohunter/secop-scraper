/** Un dataset sin sincronizar en más de 36 h se marca como desactualizado (SPEC 04). */
export const STALE_AFTER_MS = 36 * 60 * 60 * 1000;

const DATASET_LABELS: Record<string, string> = {
  'secop2-processes': 'Procesos SECOP II',
  'secop2-contracts': 'Contratos SECOP II',
  'secop1-processes': 'Procesos SECOP I',
};

export function datasetLabel(key: string): string {
  return DATASET_LABELS[key] ?? key;
}

export interface FreshnessSummary {
  /** Sincronización más reciente entre todos los datasets, o `null` si ninguno ha sincronizado. */
  latest: Date | null;
  /** Datasets con más de 36 h (o nunca sincronizados), con su etiqueta legible. */
  stale: string[];
}

export function summarizeFreshness(
  lastSyncedAt: Record<string, string | null>,
  now: number,
): FreshnessSummary {
  let latest: number | null = null;
  const stale: string[] = [];

  for (const [dataset, value] of Object.entries(lastSyncedAt)) {
    const time = value === null ? Number.NaN : Date.parse(value);
    if (Number.isNaN(time)) {
      stale.push(datasetLabel(dataset));
      continue;
    }
    if (latest === null || time > latest) latest = time;
    if (now - time > STALE_AFTER_MS) stale.push(datasetLabel(dataset));
  }

  return { latest: latest === null ? null : new Date(latest), stale };
}
