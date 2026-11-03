/** Roles de realm que emite Keycloak en `realm_access.roles` (SPEC 05). */
export const ROLES = [
  'procurement:read',
  'procurement:export',
  'procurement:refresh',
  'alerts:manage',
  'catalog:read',
  'catalog:write',
  'ingestion:run',
] as const;

export type Role = (typeof ROLES)[number];
