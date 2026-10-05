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

export const test = base;
export { expect };
