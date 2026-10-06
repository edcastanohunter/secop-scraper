import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { IndustryRef, Location } from '../../api/models';

/** Chips de industrias. Con `max`, el resto se resume en "+N". */
@Component({
  selector: 'app-industry-chips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="flex flex-wrap gap-1" aria-label="Industrias">
      @for (industry of visible(); track industry.id) {
        <li class="chip">{{ industry.name }}</li>
      }
      @if (hidden() > 0) {
        <li class="chip text-muted" [title]="hiddenNames()">+{{ hidden() }}</li>
      }
    </ul>
  `,
})
export class IndustryChips {
  readonly industries = input.required<readonly IndustryRef[]>();
  readonly max = input(3);

  protected readonly visible = computed(() => this.industries().slice(0, this.max()));
  protected readonly hidden = computed(() => Math.max(0, this.industries().length - this.max()));
  protected readonly hiddenNames = computed(() =>
    this.industries()
      .slice(this.max())
      .map((i) => i.name)
      .join(', '),
  );
}

/**
 * Municipio normalizado (DIVIPOLA) y, con `showRaw`, el texto original de SECOP:
 * "Bogotá D.C. (Bogotá D.C.) · Fuente: «BOGOTA D.C.»".
 */
@Component({
  selector: 'app-location-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let place = location();
    @if (place.municipalityName) {
      <span>{{ place.municipalityName }}</span>
      @if (place.departmentName && place.departmentName !== place.municipalityName) {
        <span class="text-muted"> ({{ place.departmentName }})</span>
      }
    } @else if (place.departmentName) {
      <span>{{ place.departmentName }}</span>
    } @else {
      <span class="text-muted">Sin ubicación normalizada</span>
    }
    @if (showRaw() && raw()) {
      <span class="mt-0.5 block text-xs text-muted">Fuente: «{{ raw() }}»</span>
    }
  `,
})
export class LocationCell {
  readonly location = input.required<Location>();
  readonly showRaw = input(false);

  protected readonly raw = computed(() => {
    const { municipalityRaw, departmentRaw } = this.location();
    return [municipalityRaw, departmentRaw].filter(Boolean).join(', ');
  });
}
