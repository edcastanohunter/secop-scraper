import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';

let nextId = 0;

/** "17500000" → "17.500.000" (separador de miles es-CO). */
export function maskCop(digits: string): string {
  const clean = digits.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** "$ 17.500.000" → 17500000; vacío → null. */
export function unmaskCop(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : null;
}

/** Monto en COP con máscara de miles. Emite el valor al salir del campo o con Enter. */
@Component({
  selector: 'app-amount-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="label" [for]="id">{{ label() }}</label>
    <div class="relative">
      <span
        class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-muted"
        aria-hidden="true"
        >$</span
      >
      <input
        [id]="id"
        type="text"
        inputmode="numeric"
        class="input ps-7 tabular"
        [placeholder]="placeholder()"
        [value]="text()"
        (input)="onInput($event)"
        (blur)="commit()"
        (keydown.enter)="commit()"
      />
    </div>
  `,
})
export class AmountInput {
  readonly label = input.required<string>();
  readonly value = input<number | null>(null);
  readonly placeholder = input('0');
  readonly changed = output<number | null>();

  protected readonly id = `amount-${nextId++}`;
  protected readonly text = linkedSignal(() => {
    const value = this.value();
    return value === null ? '' : maskCop(String(Math.round(value)));
  });

  protected onInput(event: Event): void {
    const field = event.target as HTMLInputElement;
    const masked = maskCop(field.value);
    this.text.set(masked);
    field.value = masked;
  }

  protected commit(): void {
    const next = unmaskCop(this.text());
    if (next !== this.value()) this.changed.emit(next);
  }
}
