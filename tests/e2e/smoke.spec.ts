import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// One frozen date per phase; the full state matrix grows with the UI.
const DATES = {
  direct: '2026-09-28T12:00:00Z',
  preshadow: '2026-10-12T12:00:00Z',
  retrograde: '2026-11-01T12:00:00Z',
  postshadow: '2026-11-20T12:00:00Z',
};

for (const [phase, date] of Object.entries(DATES)) {
  test(`${phase}: renders the phase and has no serious a11y issues`, async ({ page }) => {
    await page.clock.setFixedTime(new Date(date));
    await page.goto('./');
    await expect(page.locator('html')).toHaveAttribute('data-phase', phase);
    await expect(page.locator('#status')).toContainText(`Mercury is ${phase}`);

    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the page still reads correctly', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Mercury RX/);
    await expect(page.locator('#status')).toBeVisible();
  });
});
