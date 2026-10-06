import { formatCop } from '../utils/format';
import { FilterDefaults, SearchFilters, withDefaults } from '../utils/filters';
import { sourceLabel, statusLabel } from '../utils/labels';

/** Cómo poner nombre a los ids que viajan en los filtros. */
export interface FilterNames {
  industry(id: string): string;
  department(code: string): string;
  municipality(code: string): string;
}

export type ChipKey = keyof SearchFilters;

export interface FilterChip {
  key: ChipKey;
  /** Valor concreto dentro de un filtro múltiple; ausente si el chip es el filtro entero. */
  value?: string;
  label: string;
}

function isoToDisplay(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

/** Chips de los filtros activos (los que difieren de los valores por defecto de la pantalla). */
export function describeFilters(
  filters: SearchFilters,
  names: FilterNames,
  defaults: FilterDefaults = {},
): FilterChip[] {
  const base = withDefaults(defaults);
  const chips: FilterChip[] = [];
  if (filters.q) chips.push({ key: 'q', label: `“${filters.q}”` });
  for (const id of filters.industry)
    chips.push({ key: 'industry', value: id, label: names.industry(id) });
  for (const code of filters.department) {
    chips.push({ key: 'department', value: code, label: names.department(code) });
  }
  for (const code of filters.municipality) {
    chips.push({ key: 'municipality', value: code, label: names.municipality(code) });
  }
  if (filters.entity) chips.push({ key: 'entity', label: `Entidad: ${filters.entity}` });
  if (filters.source) chips.push({ key: 'source', label: sourceLabel(filters.source) });
  for (const status of filters.status) {
    chips.push({ key: 'status', value: status, label: statusLabel(status) });
  }
  for (const modality of filters.modality) {
    chips.push({ key: 'modality', value: modality, label: modality });
  }
  if (filters.minAmount !== null) {
    chips.push({ key: 'minAmount', label: `Desde ${formatCop(filters.minAmount)}` });
  }
  if (filters.maxAmount !== null) {
    chips.push({ key: 'maxAmount', label: `Hasta ${formatCop(filters.maxAmount)}` });
  }
  if (filters.dateFrom && filters.dateFrom !== base.dateFrom) {
    chips.push({ key: 'dateFrom', label: `Desde el ${isoToDisplay(filters.dateFrom)}` });
  }
  if (filters.dateTo && filters.dateTo !== base.dateTo) {
    chips.push({ key: 'dateTo', label: `Hasta el ${isoToDisplay(filters.dateTo)}` });
  }
  if (filters.onlyActive !== base.onlyActive) {
    chips.push({
      key: 'onlyActive',
      label: filters.onlyActive ? 'Solo vigentes' : 'Incluye no vigentes',
    });
  }
  if (filters.competitiveOnly !== base.competitiveOnly) {
    chips.push({
      key: 'competitiveOnly',
      label: filters.competitiveOnly ? 'Solo competitivos' : 'Incluye contratación directa',
    });
  }
  return chips;
}

/** El cambio que quita un chip: saca el valor de la lista o devuelve el filtro a su defecto. */
export function removeChip(
  filters: SearchFilters,
  chip: FilterChip,
  defaults: FilterDefaults = {},
): Partial<SearchFilters> {
  const current = filters[chip.key];
  if (Array.isArray(current) && chip.value !== undefined) {
    return { [chip.key]: current.filter((v) => v !== chip.value) };
  }
  return { [chip.key]: withDefaults(defaults)[chip.key] };
}

/** Resumen legible de una búsqueda guardada: "Software · Cajicá, Chía · Solo vigentes". */
export function summarizeFilters(filters: SearchFilters, names: FilterNames): string {
  const parts: string[] = [];
  const join = (values: string[]) => values.join(', ');
  if (filters.q) parts.push(`“${filters.q}”`);
  if (filters.industry.length) parts.push(join(filters.industry.map(names.industry)));
  const places = [
    ...filters.municipality.map(names.municipality),
    ...filters.department.map(names.department),
  ];
  if (places.length) parts.push(join(places));
  if (filters.entity) parts.push(filters.entity);
  if (filters.source) parts.push(sourceLabel(filters.source));
  if (filters.status.length) parts.push(join(filters.status.map(statusLabel)));
  if (filters.minAmount !== null || filters.maxAmount !== null) {
    parts.push(
      `${filters.minAmount !== null ? formatCop(filters.minAmount) : '$ 0'} – ${
        filters.maxAmount !== null ? formatCop(filters.maxAmount) : 'sin tope'
      }`,
    );
  }
  if (filters.onlyActive) parts.push('Solo vigentes');
  return parts.length ? parts.join(' · ') : 'Sin filtros';
}
