import { expect, expectNoA11yViolations, test } from './fixtures';

test.describe('Panel', () => {
  test('muestra KPIs de los últimos 12 meses y las gráficas', async ({ page }) => {
    await page.goto('/');
    const kpis = page.getByRole('region', { name: 'Indicadores' });

    await expect(kpis.getByText('Procesos', { exact: true })).toBeVisible();
    await expect(kpis.getByText('Vigentes', { exact: true })).toBeVisible();
    await expect(kpis.getByText(/Del \d{2}\/\d{2}\/\d{4} al \d{2}\/\d{2}\/\d{4}/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Evolución' })).toBeVisible();
    // Las gráficas se cargan en diferido al entrar en pantalla.
    await page.getByRole('heading', { name: 'Por industria' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('img', { name: /Por industria/ })).toBeVisible();
  });

  test('"Ver datos" ofrece una tabla alternativa de cada gráfica', async ({ page }) => {
    await page.goto('/');
    const card = page.getByRole('region', { name: 'Por departamento' });
    await card.getByRole('button', { name: 'Ver datos' }).click();

    const table = card.getByRole('table', { name: 'Por departamento' });
    await expect(table).toContainText('Cundinamarca');
    await expect(table.getByRole('columnheader', { name: 'Registros' })).toBeVisible();
  });

  test('un departamento baja a sus municipios y se puede volver', async ({ page }) => {
    await page.goto('/?department=25');
    await expect(page.getByRole('heading', { name: 'Por municipio · Cundinamarca' })).toBeVisible();

    await page.getByRole('button', { name: '← Departamentos' }).click();
    await expect(page.getByRole('heading', { name: 'Por departamento' })).toBeVisible();
    await expect(page).not.toHaveURL(/department=/);
  });

  test('cambiar a contratos y a la vista semanal queda en la URL', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Contratos', exact: true }).click();
    await expect(page).toHaveURL(/kind=contracts/);
    await expect(
      page.getByRole('region', { name: 'Indicadores' }).getByText('Contratos', { exact: true }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Semana' }).click();
    await expect(page).toHaveURL(/interval=week/);
  });

  test('las entidades del top enlazan al listado filtrado', async ({ page }) => {
    await page.goto('/');
    const table = page.getByRole('table', { name: 'Entidades contratantes con más registros' });
    const first = table.getByRole('link').first();
    const name = (await first.textContent())?.trim() ?? '';

    await first.click();
    await expect(page).toHaveURL(/\/licitaciones\?entity=/);
    await expect(page.getByRole('list', { name: 'Filtros activos' })).toContainText(
      `Entidad: ${name}`,
    );
  });

  test('sin violaciones de accesibilidad', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('table', { name: 'Entidades contratantes con más registros' }),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });
});
