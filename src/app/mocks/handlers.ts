import { delay, http, HttpResponse } from 'msw';

import { apiUrl } from '../core/config/api-url';
import { freshnessFixture } from './fixtures/meta';

/** Latencia simulada para que se vean los skeletons. */
const LATENCY_MS = 250;

export const handlers = [
  http.get(apiUrl('/meta/freshness'), async () => {
    await delay(LATENCY_MS);
    return HttpResponse.json(freshnessFixture());
  }),
];
