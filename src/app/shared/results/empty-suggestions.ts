import { FilterDefaults, SearchFilters, withDefaults } from '../utils/filters';

export interface Suggestion {
  label: string;
  patch: Partial<SearchFilters>;
}

/** Qué filtros quitar cuando no hay resultados, del más al menos restrictivo. */
export function emptySuggestions(
  filters: SearchFilters,
  defaults: FilterDefaults = {},
): Suggestion[] {
  const base = withDefaults(defaults);
  const suggestions: Suggestion[] = [];
  if (filters.municipality.length > 0) {
    suggestions.push({ label: 'Quita el filtro de municipio', patch: { municipality: [] } });
  }
  if (filters.onlyActive) {
    suggestions.push({ label: 'Desactiva "Solo vigentes"', patch: { onlyActive: false } });
  }
  if (filters.industry.length > 0) {
    suggestions.push({ label: 'Quita las industrias', patch: { industry: [] } });
  }
  if (filters.q) suggestions.push({ label: 'Borra el texto de búsqueda', patch: { q: '' } });
  if (filters.status.length > 0)
    suggestions.push({ label: 'Quita el filtro de estado', patch: { status: [] } });
  if (filters.dateFrom !== base.dateFrom || filters.dateTo !== base.dateTo) {
    suggestions.push({
      label: 'Amplía las fechas',
      patch: { dateFrom: base.dateFrom, dateTo: base.dateTo },
    });
  }
  return suggestions.slice(0, 3);
}
