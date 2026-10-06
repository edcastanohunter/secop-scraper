import AxeBuilder from '@axe-core/playwright';
import { Page, test as base, expect } from '@playwright/test';

/** Misma clave que `MOCK_ROLES_STORAGE_KEY` en `mock-auth.service.ts`. */
const MOCK_ROLES_KEY = 'secop-mock-roles';

/** Fija los roles del usuario simulado antes de que arranque la app. */
export async function useRoles(page: Page, roles: string[]): Promise<void> {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    MOCK_ROLES_KEY,
    roles.join(','),
  ] as const);
}

/** Falla con la lista de violaciones WCAG 2.x A/AA que encuentre axe. */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

/** En móvil los filtros viven en un panel lateral: lo abre antes de usarlos. */
export async function openFilters(page: Page, isMobile: boolean): Promise<void> {
  if (isMobile) await page.getByRole('button', { name: /^Filtros/ }).click();
}

export async function closeFilters(page: Page, isMobile: boolean): Promise<void> {
  if (isMobile) await page.getByRole('button', { name: 'Ver resultados' }).click();
}

/**
 * Navega dentro de la SPA con el menú principal. Los mocks guardan el estado en memoria:
 * un `page.goto` lo reinicia, un clic en el menú no.
 */
export async function navTo(page: Page, isMobile: boolean, label: string): Promise<void> {
  if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: label })
    .click();
}

/** Busca y elige un municipio en el autocompletar de la barra de filtros. */
export async function pickMunicipality(page: Page, text: string, option: RegExp): Promise<void> {
  await page.getByRole('combobox', { name: 'Municipio' }).fill(text);
  await page.getByRole('option', { name: option }).click();
}

export const test = base;
export { expect };
