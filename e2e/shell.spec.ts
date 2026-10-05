import { expect, expectNoA11yViolations, test, useRoles } from './fixtures';

test.describe('Shell', () => {
  test('muestra la atribución CC BY-SA 4.0 y la frescura de los datos', async ({ page }) => {
    await page.goto('/');

    const footer = page.getByRole('contentinfo');
    await expect(footer).toContainText('Fuente: Colombia Compra Eficiente – SECOP');
    await expect(footer.getByRole('link', { name: 'CC BY-SA 4.0' })).toHaveAttribute(
      'href',
      /creativecommons\.org\/licenses\/by-sa\/4\.0/,
    );
    await expect(footer).toContainText(/Datos actualizados al \d{2}\/\d{2}\/\d{4}/);
    await expect(page).toHaveTitle('Panel · SECOP Radar');
  });

  test('el menú de usuario ofrece Mi cuenta y Cerrar sesión', async ({ page, isMobile }) => {
    await page.goto('/');
    await page.getByRole('button', { name: isMobile ? 'Menú de usuario' : 'Usuaria Demo' }).click();

    const menu = page.getByRole('menu', { name: 'Menú de usuario' });
    await expect(menu).toContainText('demo@secopradar.test');
    await expect(menu.getByRole('menuitem', { name: 'Mi cuenta' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  });

  test('el interruptor de tema alterna sistema → claro → oscuro', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/acerca-de-los-datos');
    const html = page.locator('html');

    await page.getByRole('button', { name: /Tema: sistema/ }).click();
    await expect(html).not.toHaveClass(/dark/);
    await page.getByRole('button', { name: /Tema: claro/ }).click();
    await expect(html).toHaveClass(/dark/);

    await page.reload();
    await expect(html).toHaveClass(/dark/);
  });

  test('una ruta inexistente muestra el 404 amable', async ({ page }) => {
    await page.goto('/no-existe');
    await expect(page.getByRole('heading', { name: 'No encontramos esta página' })).toBeVisible();
  });

  test('la página Acerca de los datos no tiene violaciones de accesibilidad', async ({ page }) => {
    await page.goto('/acerca-de-los-datos');
    await expect(page.getByRole('heading', { name: '¿Qué significa “vigente”?' })).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

test.describe('Permisos', () => {
  test('sin ingestion:run, /admin/ingesta lleva a "No tienes permiso"', async ({
    page,
    isMobile,
  }) => {
    await useRoles(page, ['procurement:read']);
    await page.goto('/admin/ingesta');

    await expect(page.getByRole('heading', { name: 'No tienes permiso' })).toBeVisible();
    if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click();
    const nav = page.getByRole('navigation', { name: 'Principal' });
    await expect(nav.getByRole('link', { name: 'Licitaciones' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Ingesta' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Mis búsquedas' })).toHaveCount(0);
  });

  test('con ingestion:run, /admin/ingesta abre', async ({ page }) => {
    await useRoles(page, ['procurement:read', 'ingestion:run']);
    await page.goto('/admin/ingesta');

    await expect(page.getByRole('heading', { name: 'Ingesta', level: 1 })).toBeVisible();
  });
});
