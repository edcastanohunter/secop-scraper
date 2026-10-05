import { Environment } from './environment.model';

/** `ng serve --configuration=mock`: MSW intercepta `apiBaseUrl` y la sesión es simulada. */
export const environment: Environment = {
  mock: true,
  apiBaseUrl: 'http://localhost:5146',
  keycloak: {
    url: 'http://localhost:8080',
    realm: 'secopscrapper',
    clientId: 'secopscrapper-web',
  },
};
