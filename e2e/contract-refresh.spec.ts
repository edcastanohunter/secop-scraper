import { expect, expectNoA11yViolations, test, useRoles } from './fixtures';

/** Contrato SECOP II con valor ×1000 en los mocks (`IMPLAUSIBLE_CONTRACT_ID`). */
const FLAGGED = '/contratos/secop2/CO1.PCCNTR.8000300';

test.describe('Actualizar contrato y valor sospechoso (SPEC 17)', () => {
  test('el contrato sospechoso muestra la advertencia y el refresh no cambia nada', async ({
    page,
  }) => {
    await page.goto(FLAGGED);
    await expect(page.getByText('Valor sospechoso').first()).toBeVisible();

    await page.getByRole('button', { name: 'Actualizar desde SECOP' }).click();
    await expect(
      page.getByText('SECOP todavía publica los mismos datos para este contrato.'),
    ).toBeVisible();
    await expect(page.getByText(/la entidad contratante debe corregirlo/)).toBeVisible();
    await expect(page.getByText('Valor sospechoso').first()).toBeVisible();
    // Cooldown de 60 s tras el refresh.
    await expect(page.getByRole('button', { name: /Disponible en \d+ s/ })).toBeDisabled();
  });

  test('un lector no ve el botón de actualizar', async ({ page }) => {
    await useRoles(page, ['procurement:read']);
    await page.goto(FLAGGED);
    await expect(page.getByText('Valor sospechoso').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Actualizar desde SECOP' })).toHaveCount(0);
  });

  test('sin violaciones de accesibilidad con la advertencia', async ({ page }) => {
    await page.goto(FLAGGED);
    await expect(page.getByText('Valor sospechoso').first()).toBeVisible();
    await expectNoA11yViolations(page);
  });
});
