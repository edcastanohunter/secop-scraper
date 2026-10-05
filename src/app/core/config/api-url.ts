import { environment } from '../../../environments/environment';

/** Construye la URL absoluta de un endpoint de SecopScrapper. `path` empieza por `/`. */
export function apiUrl(path: string): string {
  return `${environment.apiBaseUrl}${path}`;
}

export function isApiRequest(url: string): boolean {
  return url.startsWith(environment.apiBaseUrl);
}

/** Endpoints que la API sirve sin token (SPEC 08: baja de alertas desde el email). */
const PUBLIC_API_PATHS = ['/alerts/unsubscribe'];

export function isPublicApiRequest(url: string): boolean {
  if (!isApiRequest(url)) return false;
  const path = url.slice(environment.apiBaseUrl.length).split('?')[0];
  return PUBLIC_API_PATHS.includes(path);
}
