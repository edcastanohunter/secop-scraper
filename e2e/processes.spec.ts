import {
  closeFilters,
  expect,
  expectNoA11yViolations,
  openFilters,
  pickMunicipality,
  test,
} from './fixtures';

test.describe('Licitaciones', () => {
  test('filtrar por Software y Cajicá pide los filtros a la API y los deja en la URL', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/licitaciones');
    await expect(page.getByText(/\d+ procesos/)).toBeVisible();

    await openFilters(page, isMobile);
    await page.getByRole('checkbox', { name: /^Desarrollo de Software/ }).check();
    await expect(page).toHaveURL(/industry=software/);

    const request = page.waitForRequest((req) => {
      const url = new URL(req.url());
      return (
        url.pathname === '/processes' &&
        url.searchParams.getAll('industry').includes('software') &&
        url.searchParams.getAll('municipality').includes('25126')
      );
    });
    await pickMunicipality(page, 'Caj', /^Cajicá/);
    const url = new URL((await request).url());

    expect(url.searchParams.get('onlyActive')).toBe('true');
    expect(url.searchParams.get('competitiveOnly')).toBe('true');
    await expect(page).toHaveURL(/industry=software&municipality=25126/);
    await closeFilters(page, isMobile);

    const filters = page.getByRole('list', { name: 'Filtros activos' });
    await expect(filters).toContainText('Desarrollo de Software');
    await expect(filters).toContainText('Cajicá (Cundinamarca)');
    const results = page.getByRole(isMobile ? 'list' : 'table', {
      name: 'Procesos de contratación',
    });
    await expect(results).toContainText('Cajicá');
    await expect(results).not.toContainText('Bogotá');
  });

  test('recargar la URL restaura los mismos filtros y resultados', async ({ page, isMobile }) => {
    await page.goto('/licitaciones?industry=software&municipality=25126');
    const total = await page.getByText(/^\s*\d+ procesos?\s*$/).textContent();

    await page.reload();
    await expect(page.getByText(/^\s*\d+ procesos?\s*$/)).toHaveText(total ?? '');
    await openFilters(page, isMobile);
    await expect(page.getByRole('checkbox', { name: /^Desarrollo de Software/ })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Solo vigentes' })).toBeChecked();
    await expect(page.getByRole('list', { name: 'Municipios elegidos' })).toContainText('Cajicá');
  });

  test('los facets cambian al aplicar otros filtros', async ({ page, isMobile }) => {
    await page.goto('/licitaciones');
    await openFilters(page, isMobile);
    const department = page.getByRole('checkbox', { name: /^Cundinamarca/ });
    const before = await department.locator('xpath=ancestor::label').textContent();

    await page.getByRole('checkbox', { name: /^Salud/ }).check();
    await expect(department.locator('xpath=ancestor::label')).not.toHaveText(before ?? '');
  });

  test('paginación, orden y filtros vacíos con sugerencias', async ({ page }) => {
    await page.goto('/licitaciones?onlyActive=false&competitiveOnly=false');
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Página 2 de \d+/)).toBeVisible();

    await page.getByLabel('Ordenar').selectOption('amount_desc');
    await expect(page).toHaveURL(/sort=amount_desc/);
    await expect(page).not.toHaveURL(/page=2/);

    await page.goto('/licitaciones?q=zzzz-sin-resultados');
    await expect(
      page.getByRole('heading', { name: 'No encontramos licitaciones con estos filtros' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Borra el texto de búsqueda' }).click();
    await expect(page).not.toHaveURL(/q=/);
  });

  test('el buscador espera a que termines de escribir', async ({ page }) => {
    await page.goto('/licitaciones');
    await page
      .getByRole('searchbox', { name: 'Buscar' })
      .pressSequentially('papelería', { delay: 30 });
    await expect(page).toHaveURL(/q=papeler%C3%ADa/);
    await expect(page.getByRole('list', { name: 'Filtros activos' })).toContainText('“papelería”');
  });

  test('con muchos resultados avisa que hay que afinar los filtros', async ({ page }) => {
    await page.goto('/licitaciones?q=todo');
    await expect(page.getByText('Más de 10.000 resultados, afina los filtros.')).toBeVisible();
  });

  test('sin violaciones de accesibilidad', async ({ page }) => {
    await page.goto('/licitaciones');
    await expect(page.getByText(/\d+ procesos/)).toBeVisible();
    await expectNoA11yViolations(page);
  });
});
