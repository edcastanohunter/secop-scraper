/**
 * Modelos de la API. Salen del OpenAPI generado (`npm run gen:api`) y corrigen lo que el
 * documento no expresa bien (ver la tabla "Diferencias OpenAPI vs prompt" del README):
 *
 * - Los enums viajan como `string`: aquí se tipan con sus valores reales (`snake_case`).
 * - ASP.NET fusionó todos los `record Request` anidados en un único esquema `Request`
 *   (`{ title, description }`, el de WorkItems). Los cuerpos reales están abajo, tomados de
 *   los endpoints del backend.
 * - `GET /saved-searches/{id}/results` devuelve la página de procesos o la de contratos según
 *   el `kind` de la búsqueda; el OpenAPI solo declara la de contratos.
 *
 * Es el único archivo que importa `generated/`.
 */
import type { components } from './generated/schema';

type Schemas = components['schemas'];

// ── Enums (valores verificados en el dominio del backend) ──────────────────────────────

export type Source = 'secop1' | 'secop2';
export type ProcessStatus = 'open' | 'evaluation' | 'awarded' | 'closed' | 'cancelled' | 'unknown';
export type ContractStatus =
  'signed' | 'in_progress' | 'suspended' | 'finished' | 'cancelled' | 'unknown';
export type SearchKind = 'processes' | 'contracts';
export type OpportunityKind = 'process' | 'contract';
export type SortOrder =
  'relevance' | 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'deadline_asc';
export type StatsInterval = 'day' | 'week' | 'month';
export type LocationLevel = 'department' | 'municipality';
export type AlertFrequency = 'none' | 'daily' | 'weekly';
export type DeliveryStatus = 'queued' | 'sent' | 'failed';
export type DatasetKey = 'secop2-processes' | 'secop2-contracts' | 'secop1-processes';
export type IngestionMode = 'backfill' | 'incremental' | 'reconcile' | 'refresh-open';
export type IngestionRunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type EnrichmentStatus =
  'pending' | 'running' | 'succeeded' | 'failed' | 'blocked' | 'skipped';

export const PROCESS_STATUSES: readonly ProcessStatus[] = [
  'open',
  'evaluation',
  'awarded',
  'closed',
  'cancelled',
  'unknown',
];
export const CONTRACT_STATUSES: readonly ContractStatus[] = [
  'signed',
  'in_progress',
  'suspended',
  'finished',
  'cancelled',
  'unknown',
];
export const DATASET_KEYS: readonly DatasetKey[] = [
  'secop2-processes',
  'secop2-contracts',
  'secop1-processes',
];
export const INGESTION_MODES: readonly IngestionMode[] = [
  'backfill',
  'incremental',
  'reconcile',
  'refresh-open',
];
/** Estados de enriquecimiento tras los que ya no hay que seguir consultando. */
export const FINAL_ENRICHMENT_STATUSES: readonly EnrichmentStatus[] = [
  'succeeded',
  'failed',
  'blocked',
  'skipped',
];

// ── Comunes ───────────────────────────────────────────────────────────────────────────

export type Attribution = Schemas['Attribution'];
export type Freshness = Schemas['DataFreshness'];
export type StatsFreshness = Schemas['StatsFreshness'];
export type Location = Schemas['LocationDto'];
export type IndustryRef = Schemas['IndustryRef'];

/** `SearchPage<T>` de SPEC 05. */
export interface SearchPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalCountIsCapped: boolean;
  attribution: Attribution;
  freshness: Freshness;
}

/** `PagedList<T>` de los listados administrativos. */
export interface PagedList<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

// ── Catálogos ─────────────────────────────────────────────────────────────────────────

export type Department = Schemas['DepartmentResponse'];
export type Municipality = Schemas['MunicipalityResponse'];
export type Industry = Schemas['IndustryResponse'];
export type UnresolvedLocation = Schemas['UnresolvedLocationResponse'];
export type RefreshDivipolaResult = Schemas['RefreshDivipolaResult'];

/** `POST /catalog/location-aliases` (el OpenAPI lo publica como `Request`). */
export interface CreateLocationAliasRequest {
  departmentRaw: string | null;
  municipalityRaw: string;
  divipolaCode: string;
}

/** `PUT /catalog/industry-mappings/{prefix}` (el OpenAPI lo publica como `Request`). */
export interface UpsertIndustryMappingRequest {
  industryId: string;
}

// ── Procesos, contratos y búsqueda ────────────────────────────────────────────────────

export type ProcessSummary = Omit<Schemas['ProcessSummary'], 'source' | 'status'> & {
  source: Source;
  status: ProcessStatus;
};
export type ContractSummary = Omit<Schemas['ContractSummary'], 'source' | 'status'> & {
  source: Source;
  status: ContractStatus;
};
export type ProcessDetail = Omit<
  Schemas['ProcessDetail'],
  'source' | 'status' | 'contracts' | 'enrichment'
> & {
  source: Source;
  status: ProcessStatus;
  contracts: ContractSummary[];
  enrichment?: Enrichment | null;
};
export type ContractDetail = Omit<Schemas['ContractDetail'], 'source' | 'status'> & {
  source: Source;
  status: ContractStatus;
};
export type OpportunityItem = Omit<Schemas['OpportunityItem'], 'kind' | 'source'> & {
  kind: OpportunityKind;
  source: Source;
};

// ── Enriquecimiento y scraping ────────────────────────────────────────────────────────

export type EnrichmentDocument = Schemas['EnrichmentDocumentResponse'];
export type ScheduleEntry = Schemas['ScheduleEntryResponse'];
export type Enrichment = Omit<Schemas['EnrichmentResponse'], 'status'> & {
  status: EnrichmentStatus;
};
export type ScrapingStatus = Schemas['ScrapingStatusResponse'];

// ── Estadísticas ──────────────────────────────────────────────────────────────────────

export type StatsSummary = Schemas['StatsSummary'];
export type TimeSeriesPoint = Schemas['TimeSeriesPoint'];
export type IndustryBucket = Schemas['IndustryBucket'];
export type LocationBucket = Schemas['LocationBucket'];
export type EntityBucket = Schemas['EntityBucket'];
export type FacetValue = Schemas['FacetValue'];
export type Facets = Schemas['Facets'];

export interface StatsList<T> {
  items: T[];
  attribution: Attribution;
  freshness: StatsFreshness;
}

// ── Búsquedas guardadas y alertas ─────────────────────────────────────────────────────

export type SavedSearchFilter = Schemas['SavedSearchFilter'];
export type SavedSearch = Omit<Schemas['SavedSearchResponse'], 'kind' | 'frequency'> & {
  kind: SearchKind;
  frequency: AlertFrequency;
};
export type AlertDelivery = Omit<Schemas['AlertDeliveryResponse'], 'status'> & {
  status: DeliveryStatus;
};

/** `POST /saved-searches` (el OpenAPI lo publica como `Request`). */
export interface CreateSavedSearchRequest {
  name: string;
  kind: SearchKind;
  filters: SavedSearchFilter | null;
  frequency: AlertFrequency;
}

/** `PUT /saved-searches/{id}`: el `kind` no cambia nunca. */
export type UpdateSavedSearchRequest = Omit<CreateSavedSearchRequest, 'kind'>;

/** `GET /saved-searches/{id}/results`: la página depende del `kind` de la búsqueda. */
export type SavedSearchResults = SearchPage<ProcessSummary> | SearchPage<ContractSummary>;

// ── Ingesta ───────────────────────────────────────────────────────────────────────────

export type IngestionRun = Omit<
  Schemas['IngestionRunResponse'],
  'datasetKey' | 'mode' | 'status'
> & {
  datasetKey: DatasetKey;
  mode: IngestionMode;
  status: IngestionRunStatus;
};
export type SyncCheckpoint = Omit<Schemas['SyncCheckpointResponse'], 'datasetKey'> & {
  datasetKey: DatasetKey;
};

/** `POST /ingestion/runs` (el OpenAPI lo publica como `Request`). Fechas `yyyy-MM-dd`. */
export interface QueueIngestionRunRequest {
  datasetKey: DatasetKey;
  mode: IngestionMode;
  from: string | null;
  to: string | null;
}

export interface QueueIngestionRunResponse {
  runId: string;
}
