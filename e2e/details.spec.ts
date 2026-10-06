import { expect, expectNoA11yViolations, test } from './fixtures';

/** Ids de los fixtures de `src/app/mocks/fixtures/procurement.ts`. */
const OPEN_PROCESS = '/licitaciones/secop2/CO1.REQ.7000100';
const AWARDED_PROCESS = '/licitaciones/secop2/CO1.REQ.7000511';
const BLOCKED_PROCESS = '/licitaciones/secop2/CO1.REQ.7009999';

test.describe('Detalle de proceso', () => {
  test('muestra la ficha, la ubicación original y el enlace a SECOP', async ({ page }) => {
    await page.goto(OPEN_PROCESS);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Desarrollo e implementación de la plataforma de trámites en línea',
    );
    await expect(page.getByText('Vigente', { exact: true })).toBeVisible();
    await expect(page.getByText('Fuente: «CAJICA, CUNDINAMARCA»')).toBeVisible();
    const secop = page.getByRole('link', { name: /Ver en SECOP/ });
    await expect(secop).toHaveAttribute('target', '_blank');
    await expect(secop).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('"Obtener del portal SECOP" consulta hasta tener documentos y cronograma', async ({
    page,
  }) => {
    await page.goto(OPEN_PROCESS);
    await page.getByRole('button', { name: 'Obtener del portal SECOP' }).click();

    await expect(page.getByRole('button', { name: /Consultando/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Pliego de condiciones definitivo/ })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Presentación de ofertas')).toBeVisible();
  });

  test('si el portal bloqueó el scraping dice hasta qué hora', async ({ page }) => {
    await page.goto(BLOCKED_PROCESS);
    await page.getByRole('button', { name: 'Obtener del portal SECOP' }).click();

    await expect(page.getByRole('alert')).toContainText(
      /El portal SECOP limitó el acceso; inténtalo después de las \d{2}:\d{2}/,
    );
  });

  test('lista los contratos relacionados y lleva a su detalle', async ({ page, isMobile }) => {
    await page.goto(AWARDED_PROCESS);
    const related = page.getByRole(isMobile ? 'list' : 'table', { name: 'Contratos relacionados' });
    await expect(related).toBeVisible();

    await related.getByRole('link').first().click();
    await expect(page).toHaveURL(/\/contratos\/secop2\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Proceso de origen:')).toBeVisible();
  });

  test('un proceso inexistente muestra un error humano sin reintento', async ({ page }) => {
    await page.goto('/licitaciones/secop2/NO-EXISTE');
    await expect(page.getByRole('alert')).toContainText('No encontramos este proceso.');
    await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);
  });

  test('sin violaciones de accesibilidad', async ({ page }) => {
    await page.goto(AWARDED_PROCESS);
    await expect(page.getByRole('heading', { name: 'Contratos relacionados' })).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

test.describe('Contratos', () => {
  test('lista contratos y abre su detalle', async ({ page, isMobile }) => {
    await page.goto('/contratos');
    await expect(page.getByText(/\d+ contratos/)).toBeVisible();

    const list = page.getByRole(isMobile ? 'list' : 'table', { name: 'Contratos', exact: true });
    await list.getByRole('link').first().click();
    await expect(page).toHaveURL(/\/contratos\/secop[12]\//);
    await expect(page.getByRole('heading', { name: 'Ficha del contrato' })).toBeVisible();
    await expect(page.getByText('Contratista')).toBeVisible();
  });
});

test.describe('Buscar', () => {
  test('mezcla procesos y contratos y enlaza cada uno a su detalle', async ({ page }) => {
    await page.goto('/buscar?q=sistema');
    const results = page.getByRole('list', { name: 'Resultados de la búsqueda' });

    await expect(results.getByText('Proceso', { exact: true }).first()).toBeVisible();
    await expect(results.getByText('Contrato', { exact: true }).first()).toBeVisible();
    await results.getByRole('link').first().click();
    await expect(page).toHaveURL(/\/(licitaciones|contratos)\/secop/);
  });
});
