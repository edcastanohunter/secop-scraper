import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Misma clave que lee el script de `index.html` antes de pintar. */
const STORAGE_KEY = 'secop-theme';
const ORDER: readonly ThemePreference[] = ['system', 'light', 'dark'];

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Almacenamiento bloqueado: se sigue al sistema.
  }
  return 'system';
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media?.matches ?? false);

  readonly preference = signal<ThemePreference>(readPreference());
  readonly isDark = computed(
    () => this.preference() === 'dark' || (this.preference() === 'system' && this.systemDark()),
  );

  private readonly apply = effect(() => {
    this.document.documentElement.classList.toggle('dark', this.isDark());
    try {
      const preference = this.preference();
      if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Sin almacenamiento el tema dura solo esta visita.
    }
  });

  constructor() {
    const listener = (event: MediaQueryListEvent) => this.systemDark.set(event.matches);
    this.media?.addEventListener('change', listener);
    inject(DestroyRef).onDestroy(() => this.media?.removeEventListener('change', listener));
  }

  /** Sistema → Claro → Oscuro → Sistema. */
  cycle(): void {
    this.preference.update((current) => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]);
  }
}
