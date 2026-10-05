/**
 * Tipos escritos a mano a partir de la SPEC 05 mientras la API no publique
 * `docs/openapi/secopscrapper.json`. Cuando exista, `npm run gen:api` genera
 * `generated/schema.d.ts` y estos tipos pasan a derivarse de ahí.
 */

export type DatasetKey = 'secop2-processes' | 'secop2-contracts' | 'secop1-processes';

/** `GET /meta/freshness` y el campo `freshness` de cada `SearchPage`. */
export interface Freshness {
  lastSyncedAt: Record<string, string | null>;
}

export interface Attribution {
  text: string;
  license: string;
  licenseUrl: string;
}
