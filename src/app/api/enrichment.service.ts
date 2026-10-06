import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap, takeWhile, timer } from 'rxjs';

import { apiUrl } from '../core/config/api-url';
import { Enrichment, FINAL_ENRICHMENT_STATUSES } from './models';

/** Cada cuánto se consulta el estado del enriquecimiento (requisito 3 del prompt). */
export const ENRICHMENT_POLL_MS = 5000;

export function isFinalEnrichment(enrichment: Enrichment): boolean {
  return FINAL_ENRICHMENT_STATUSES.includes(enrichment.status);
}

/** Documentos y cronograma raspados del portal SECOP II (SPEC 07, opcional). */
@Injectable({ providedIn: 'root' })
export class EnrichmentService {
  private readonly http = inject(HttpClient);

  get(sourceId: string): Observable<Enrichment> {
    return this.http.get<Enrichment>(this.url(sourceId));
  }

  /** 202 en cola. 503 `Scraping.Disabled` / `Scraping.HostBlocked`, 409 si ya está corriendo. */
  request(sourceId: string): Observable<Enrichment> {
    return this.http.post<Enrichment>(this.url(sourceId), null);
  }

  /** Consulta cada `intervalMs` y emite cada estado, el final incluido; después completa. */
  poll(sourceId: string, intervalMs = ENRICHMENT_POLL_MS): Observable<Enrichment> {
    return timer(intervalMs, intervalMs).pipe(
      switchMap(() => this.get(sourceId)),
      takeWhile((enrichment) => !isFinalEnrichment(enrichment), true),
    );
  }

  private url(sourceId: string): string {
    return apiUrl(`/processes/secop2/${encodeURIComponent(sourceId)}/enrichment`);
  }
}
