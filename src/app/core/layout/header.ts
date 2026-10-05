import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { Role } from '../auth/roles';
import { ThemeService } from '../theme/theme.service';
import { UserMenu } from './user-menu';

interface NavItem {
  path: string;
  label: string;
  role: Role;
  exact?: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { path: '/', label: 'Panel', role: 'procurement:read', exact: true },
  { path: '/licitaciones', label: 'Licitaciones', role: 'procurement:read' },
  { path: '/contratos', label: 'Contratos', role: 'procurement:read' },
  { path: '/buscar', label: 'Buscar', role: 'procurement:read' },
  { path: '/busquedas', label: 'Mis búsquedas', role: 'alerts:manage' },
  { path: '/admin/ingesta', label: 'Ingesta', role: 'ingestion:run' },
  { path: '/admin/catalogos', label: 'Catálogos', role: 'catalog:write' },
];

const THEME_LABELS = { system: 'sistema', light: 'claro', dark: 'oscuro' } as const;

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, UserMenu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html',
})
export class Header {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  protected readonly items = computed(() =>
    this.auth.authenticated() ? NAV_ITEMS.filter((item) => this.auth.hasRole(item.role)) : [],
  );
  protected readonly menuOpen = signal(false);
  protected readonly themeLabel = computed(() => THEME_LABELS[this.theme.preference()]);
}
