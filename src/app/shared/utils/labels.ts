import {
  AlertFrequency,
  ContractStatus,
  DatasetKey,
  DeliveryStatus,
  EnrichmentStatus,
  IngestionMode,
  IngestionRunStatus,
  ProcessStatus,
  SortOrder,
  Source,
} from '../../api/models';

/** Etiquetas en español de los enums de la API. */

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

export const PROCESS_STATUS_LABELS: Record<ProcessStatus, string> = {
  open: 'Abierto',
  evaluation: 'En evaluación',
  awarded: 'Adjudicado',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
  unknown: 'Sin estado',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  signed: 'Firmado',
  in_progress: 'En ejecución',
  suspended: 'Suspendido',
  finished: 'Terminado',
  cancelled: 'Cancelado',
  unknown: 'Sin estado',
};

const STATUS_TONES: Record<string, BadgeTone> = {
  open: 'success',
  evaluation: 'info',
  awarded: 'accent',
  closed: 'neutral',
  cancelled: 'danger',
  unknown: 'neutral',
  signed: 'info',
  in_progress: 'success',
  suspended: 'warning',
  finished: 'neutral',
};

export function statusLabel(status: string): string {
  return (
    (PROCESS_STATUS_LABELS as Record<string, string>)[status] ??
    (CONTRACT_STATUS_LABELS as Record<string, string>)[status] ??
    status
  );
}

export function statusTone(status: string): BadgeTone {
  return STATUS_TONES[status] ?? 'neutral';
}

export const SOURCE_LABELS: Record<Source, string> = { secop1: 'SECOP I', secop2: 'SECOP II' };

export function sourceLabel(source: string): string {
  return (SOURCE_LABELS as Record<string, string>)[source] ?? source;
}

export const SORT_LABELS: Record<SortOrder, string> = {
  relevance: 'Relevancia',
  date_desc: 'Más recientes',
  date_asc: 'Más antiguos',
  amount_desc: 'Mayor monto',
  amount_asc: 'Menor monto',
  deadline_asc: 'Cierre más próximo',
};

export const FREQUENCY_LABELS: Record<AlertFrequency, string> = {
  none: 'Sin alertas',
  daily: 'Diaria',
  weekly: 'Semanal',
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  queued: 'En cola',
  sent: 'Enviado',
  failed: 'Falló',
};

export const DELIVERY_STATUS_TONES: Record<DeliveryStatus, BadgeTone> = {
  queued: 'info',
  sent: 'success',
  failed: 'danger',
};

export const DATASET_LABELS: Record<DatasetKey, string> = {
  'secop2-processes': 'Procesos SECOP II',
  'secop2-contracts': 'Contratos SECOP II',
  'secop1-processes': 'Procesos SECOP I',
};

export const MODE_LABELS: Record<IngestionMode, string> = {
  backfill: 'Carga histórica',
  incremental: 'Incremental',
  reconcile: 'Reconciliación',
  'refresh-open': 'Refrescar abiertos',
};

export const RUN_STATUS_LABELS: Record<IngestionRunStatus, string> = {
  queued: 'En cola',
  running: 'En curso',
  succeeded: 'Completado',
  failed: 'Falló',
  cancelled: 'Cancelado',
};

export const RUN_STATUS_TONES: Record<IngestionRunStatus, BadgeTone> = {
  queued: 'info',
  running: 'warning',
  succeeded: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

export const ENRICHMENT_STATUS_LABELS: Record<EnrichmentStatus, string> = {
  pending: 'En cola',
  running: 'Consultando el portal…',
  succeeded: 'Actualizado',
  failed: 'Falló',
  blocked: 'Bloqueado por el portal',
  skipped: 'Omitido',
};

/** Clase utilitaria del badge para un tono. */
export function badgeClass(tone: BadgeTone): string {
  return `badge-${tone}`;
}
