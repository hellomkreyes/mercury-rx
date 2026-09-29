import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import copy from '../../src/content/copy.json' with { type: 'json' };

// One frozen date per phase; the full state matrix grows with the UI.
const DATES = {
  direct: '2026-09-28T12:00:00Z',
  preshadow: '2026-10-12T12:00:00Z',
  retrograde: '2026-11-01T12:00:00Z',
  postshadow: '2026-11-20T12:00:00Z',
} as const;

for (const [phase, date] of Object.entries(DATES) as [keyof typeof DATES, string][]) {
  test(`${phase}: renders the phase copy with no serious a11y issues`, async ({ page }) => {
    await page.clock.setFixedTime(new Date(date));
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-phase', phase);
    await expect(page.locator('[data-slot="chip"]')).toHaveText(copy.phases[phase].chip);
    await expect(page.locator('[data-slot="phase-label"]')).toHaveText(copy.phases[phase].label);

    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the build-time bake is complete', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-phase', /^(direct|preshadow|retrograde|postshadow)$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.site.title);
    await expect(page.locator('[data-slot="phase-label"]')).not.toBeEmpty();
    await expect(page.locator('[data-slot="today"]')).toContainText('UTC');
    await expect(page.locator('[data-slot="disclaimer"]')).toHaveText(copy.disclaimer.full);
  });
});
