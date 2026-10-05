import { Freshness } from '../../api/meta.models';

const HOUR_MS = 60 * 60 * 1000;

/** Sincronizaciones de la madrugada de hoy, relativas al momento de cargar los mocks. */
export function freshnessFixture(now = Date.now()): Freshness {
  return {
    lastSyncedAt: {
      'secop2-processes': new Date(now - 4 * HOUR_MS).toISOString(),
      'secop2-contracts': new Date(now - 5 * HOUR_MS).toISOString(),
      'secop1-processes': new Date(now - 6 * HOUR_MS).toISOString(),
    },
  };
}
