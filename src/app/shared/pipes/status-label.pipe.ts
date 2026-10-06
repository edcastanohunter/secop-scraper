import { Pipe, PipeTransform } from '@angular/core';

import { statusLabel } from '../utils/labels';

/** Estado de proceso o contrato (`in_progress`) → etiqueta en español ("En ejecución"). */
@Pipe({ name: 'statusLabel' })
export class StatusLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? statusLabel(value) : '—';
  }
}
