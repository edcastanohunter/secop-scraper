export interface Environment {
  /** `true` en `--configuration=mock`: MSW responde la API y no hay Keycloak. */
  mock: boolean;
  apiBaseUrl: string;
  keycloak: {
    url: string;
    realm: string;
    clientId: string;
  };
}
