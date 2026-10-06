import { Pipe, PipeTransform } from '@angular/core';

import { formatCop, formatCopCompact } from '../utils/format';

/** `17500000 | copCurrency` → `$ 17.500.000`; `| copCurrency: 'compact'` → `$ 17,5 M`. */
@Pipe({ name: 'copCurrency' })
export class CopCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined, style: 'full' | 'compact' = 'full'): string {
    return style === 'compact' ? formatCopCompact(value) : formatCop(value);
  }
}
