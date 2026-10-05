import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';

/** Página pública: fuente, licencia, frecuencia, "vigente", privacidad y limitaciones. */
@Component({
  selector: 'app-about-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about.page.html',
})
export class AboutPage {
  protected readonly auth = inject(AuthService);
}
