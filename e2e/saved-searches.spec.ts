import { expect, navTo, test, useRoles } from './fixtures';

test.describe('Búsquedas guardadas', () => {
  test('guardar desde Licitaciones y abrir /busquedas/{id} muestra los mismos resultados', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/licitaciones?industry=software&municipality=25126');
    const listTotal = Number(
      (await page.getByText(/^\s*\d+ procesos?\s*$/).textContent())?.match(/\d+/)?.[0],
    );

    await page.getByRole('button', { name: 'Guardar búsqueda' }).click();
    const dialog = page.getByRole('dialog', { name: 'Guardar búsqueda' });
    await expect(dialog).toContainText(
      'Desarrollo de Software · Cajicá (Cundinamarca) · Solo vigentes',
    );
    await dialog.getByLabel('Nombre').fill('Software Cajicá e2e');
    await dialog.getByRole('radio', { name: /Semanal/ }).check();
    await dialog.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Guardaste "Software Cajicá e2e"')).toBeVisible();

    // Navegación dentro de la SPA: los mocks guardan en memoria.
    await navTo(page, isMobile, 'Mis búsquedas');
    const card = page.getByRole('listitem').filter({ hasText: 'Software Cajicá e2e' });
    await expect(card).toContainText('Semanal');
    await card.getByRole('link', { name: 'Ver resultados' }).click();

    await expect(page).toHaveURL(/\/busquedas\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Software Cajicá e2e');
    await expect(page.getByText(`${listTotal} resultados`)).toBeVisible();
  });

  test('un nombre repetido se avisa en el diálogo (409)', async ({ page }) => {
    await page.goto('/licitaciones');
    await page.getByRole('button', { name: 'Guardar búsqueda' }).click();
    const dialog = page.getByRole('dialog', { name: 'Guardar búsqueda' });
    await dialog.getByLabel('Nombre').fill('Búsqueda repetida');
    await dialog.getByRole('button', { name: 'Guardar' }).click();

    await expect(dialog.getByText('Ya tienes una búsqueda guardada con ese nombre.')).toBeVisible();
    await expect(dialog.getByLabel('Nombre')).toHaveAttribute('aria-invalid', 'true');
  });

  test('pausar y reanudar las alertas', async ({ page }) => {
    await page.goto('/busquedas');
    const card = page.getByRole('listitem').filter({ hasText: 'Software en Cajicá y Chía' });
    await expect(card).toContainText('3 nuevos');

    await card.getByRole('button', { name: 'Pausar' }).click();
    await expect(card.getByText('Pausada')).toBeVisible();
    await card.getByRole('button', { name: 'Reanudar' }).click();
    await expect(card.getByText('Pausada')).toHaveCount(0);
  });

  test('borrar pide confirmación', async ({ page }) => {
    await page.goto('/busquedas');
    const card = page.getByRole('listitem').filter({ hasText: 'Contratos de papelería en Bogotá' });
    await card.getByRole('button', { name: /Borrar/ }).click();

    const confirm = page.getByRole('alertdialog', { name: /¿Borrar/ });
    await confirm.getByRole('button', { name: 'Cancelar' }).click();
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: /Borrar/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Borrar' }).click();
    await expect(card).toHaveCount(0);
  });

  test('la pestaña "Historial de alertas" lista los envíos', async ({ page }) => {
    await page.goto('/busquedas/0b5e55ed-0000-4000-8000-000000000001');
    await page.getByRole('tab', { name: 'Historial de alertas' }).click();

    const table = page.getByRole('table', { name: 'Historial de alertas' });
    await expect(table).toContainText('Enviado');
    await expect(table).toContainText('Falló');
  });

  test('sin alerts:manage no se ofrece guardar ni se puede entrar', async ({ page }) => {
    await useRoles(page, ['procurement:read']);
    await page.goto('/licitaciones');
    await expect(page.getByText(/\d+ procesos/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar búsqueda' })).toHaveCount(0);

    await page.goto('/busquedas');
    await expect(page.getByRole('heading', { name: 'No tienes permiso' })).toBeVisible();
  });
});
