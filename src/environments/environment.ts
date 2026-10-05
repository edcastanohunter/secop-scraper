import { Environment } from './environment.model';

export const environment: Environment = {
  mock: false,
  apiBaseUrl: 'http://localhost:5146',
  keycloak: {
    url: 'http://localhost:8080',
    realm: 'secopscrapper',
    clientId: 'secopscrapper-web', // cliente público con PKCE (SPEC 05)
  },
};
