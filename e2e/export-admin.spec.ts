import { expect, pickMunicipality, test, useRoles } from './fixtures';

test.describe('Exportar', () => {
  test('con procurement:export descarga un .csv con el nombre del servidor', async ({ page }) => {
    await page.goto('/licitaciones?industry=software');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV' }).click();

    expect((await download).suggestedFilename()).toMatch(/^processes-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test('sin procurement:export no se ve el botón', async ({ page }) => {
    await useRoles(page, ['procurement:read', 'alerts:manage']);
    await page.goto('/contratos');
    await expect(page.getByText(/\d+ contratos/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Exportar CSV' })).toHaveCount(0);
  });

  test('si hay demasiadas filas (422) avisa el conteo y sugiere filtrar', async ({ page }) => {
    await page.goto('/licitaciones?q=todo');
    await page.getByRole('button', { name: 'Exportar CSV' }).click();
    await expect(
      page.getByText(/61\.234 resultados superan el máximo de 50\.000 filas/),
    ).toBeVisible();
  });
});

test.describe('Admin de ingesta', () => {
  test('valida refresh-open y encola un run que aparece en la tabla', async ({ page }) => {
    await page.goto('/admin/ingesta');
    await page.getByLabel('Dataset', { exact: true }).selectOption('secop2-contracts');
    await page.getByLabel('Modo', { exact: true }).selectOption('refresh-open');
    await expect(
      page.getByText('"Refrescar abiertos" solo aplica a Procesos SECOP II.'),
    ).toBeVisible();

    await page.getByLabel('Dataset', { exact: true }).selectOption('secop1-processes');
    await page.getByLabel('Modo', { exact: true }).selectOption('incremental');
    await page.getByRole('button', { name: 'Encolar run' }).click();

    await expect(page.getByText(/Run encolado/)).toBeVisible();
    await expect(page.getByText('Actualizando cada 10 s')).toBeVisible();
    const table = page.getByRole('table', { name: /Runs de ingesta/ });
    await expect(table.getByRole('row').nth(1)).toContainText('Procesos SECOP I');
    await expect(table.getByRole('row').nth(1)).toContainText(/En cola|En curso/);
  });

  test('muestra checkpoints y el estado del scraping', async ({ page }) => {
    await page.goto('/admin/ingesta');
    await expect(page.getByRole('heading', { name: 'Checkpoints' })).toBeVisible();
    await expect(page.getByText('Último éxito').first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'Scraping del portal SECOP II' })).toContainText(
      'Activo',
    );
  });
});

test.describe('Admin de catálogos', () => {
  test('asignar un municipio a una ubicación sin resolver crea el alias', async ({ page }) => {
    await page.goto('/admin/catalogos');
    await page.getByRole('button', { name: 'Asignar municipio a «CAJICA - CUND.»' }).click();
    await pickMunicipality(page, 'Caj', /^Cajicá/);

    await expect(page.getByText('«CAJICA - CUND.» ahora es Cajicá (Cundinamarca).')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Asignar municipio a «CAJICA - CUND.»' }),
    ).toHaveCount(0);
  });

  test('el prefijo UNSPSC se valida y un mapeo válido se guarda', async ({ page }) => {
    await page.goto('/admin/catalogos');
    await page.getByLabel('Prefijo', { exact: true }).fill('432');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('El prefijo debe tener 2, 4, 6 u 8 dígitos.')).toBeVisible();

    await page.getByLabel('Prefijo', { exact: true }).fill('811122');
    await page.getByLabel('Industria', { exact: true }).selectOption('consultoria');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(
      page.getByText('El prefijo 811122 ahora clasifica como Consultoría.'),
    ).toBeVisible();
    await expect(page.getByRole('list', { name: 'Prefijos de Consultoría' })).toContainText(
      '811122',
    );
  });

  test('sin catalog:write no se puede entrar', async ({ page }) => {
    await useRoles(page, ['procurement:read', 'catalog:read']);
    await page.goto('/admin/catalogos');
    await expect(page.getByRole('heading', { name: 'No tienes permiso' })).toBeVisible();
  });
});
