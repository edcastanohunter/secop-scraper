import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { apiUrl } from '../core/config/api-url';
import { ScrapingStatus } from './models';

@Injectable({ providedIn: 'root' })
export class ScrapingService {
  /** Si el scraping está activo, si el portal nos bloqueó y lo ocurrido en las últimas 24 h. */
  status() {
    return httpResource<ScrapingStatus>(() => apiUrl('/scraping/status'));
  }
}
