import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
}

/** Diálogo de confirmación accesible (CDK: foco atrapado, Escape cierra, foco restaurado). */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="card w-[min(28rem,calc(100vw-2rem))] p-6 shadow-xl">
      <h2 id="confirm-title" class="text-lg font-semibold">{{ data.title }}</h2>
      <p class="mt-2 text-muted">{{ data.message }}</p>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="ref.close(false)">
          {{ data.cancelLabel ?? 'Cancelar' }}
        </button>
        <button
          type="button"
          [class]="data.danger ? 'btn bg-danger text-raised hover:opacity-90' : 'btn-primary'"
          (click)="ref.close(true)"
        >
          {{ data.confirmLabel }}
        </button>
      </div>
    </div>
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmOptions>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(Dialog);

  async ask(options: ConfirmOptions): Promise<boolean> {
    const ref = this.dialog.open<boolean>(ConfirmDialog, {
      data: options,
      ariaLabelledBy: 'confirm-title',
      role: 'alertdialog',
      backdropClass: 'app-backdrop',
    });
    return (await firstValueFrom(ref.closed)) === true;
  }
}
