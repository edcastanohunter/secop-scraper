import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

async function startMockApi(): Promise<void> {
  const { worker } = await import('./app/mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}

(environment.mock ? startMockApi() : Promise.resolve())
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err: unknown) => console.error(err));
