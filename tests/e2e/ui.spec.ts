import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import copy from '../../src/content/copy.json' with { type: 'json' };

// One frozen date per phase (all in the Oct–Nov 2026 Scorpio cycle).
const DATES = {
  direct: '2026-09-28T12:00:00Z',
  preshadow: '2026-10-12T12:00:00Z',
  retrograde: '2026-11-01T12:00:00Z',
  postshadow: '2026-11-20T12:00:00Z',
} as const;
type Phase = keyof typeof DATES;
const PHASES = Object.keys(DATES) as Phase[];
const THEMES = ['default', 'hc'] as const;
const WIDTHS = [360, 768, 1440];

async function open(page: Page, phase: Phase, theme: (typeof THEMES)[number] = 'default') {
  await page.clock.setFixedTime(new Date(DATES[phase]));
  await page.goto('/');
  // PR 4 wires the toggle; until then set the theme the way the toggle will.
  if (theme === 'hc') await page.evaluate(() => (document.documentElement.dataset.theme = 'hc'));
  await page.evaluate(() => document.fonts.ready);
}

async function seriousViolations(page: Page, disableRules: string[] = []) {
  const { violations } = await new AxeBuilder({ page }).disableRules(disableRules).analyze();
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.help}`);
}

for (const phase of PHASES) {
  test.describe(phase, () => {
    test('renders the phase', async ({ page }) => {
      await open(page, phase);
      await expect(page.locator('html')).toHaveAttribute('data-phase', phase);
      await expect(page.locator('[data-slot="chip"]')).toHaveText(copy.phases[phase].chip);
      await expect(page.locator('[data-slot="phase-label"]')).toHaveText(copy.phases[phase].label);
      await expect(page.locator('.candle')).toHaveCount(3);
      await expect(page.locator('.candle[data-state="passed"]')).toHaveCount(2);
    });

    for (const theme of THEMES) {
      test(`${theme} theme: no serious a11y issues, screenshots per width`, async ({ page }, testInfo) => {
        await open(page, phase, theme);
        expect(await seriousViolations(page)).toEqual([]);
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 900 });
          const body = await page.screenshot({ fullPage: true });
          await testInfo.attach(`${phase}-${theme}-${width}.png`, { body, contentType: 'image/png' });
        }
      });
    }
  });
}

test('reflows at 320px with no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await open(page, 'retrograde');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('skip link is the first tab stop and lands on the oracle', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Safari only tabs to links with Option+Tab by default');
  await open(page, 'direct');
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('#oracle')).toBeFocused();
});

test('controls that need JS stay hidden until PR 4 wires them', async ({ page }) => {
  await open(page, 'direct');
  await expect(page.locator('.toggles')).toBeHidden();
  await expect(page.locator('.choices')).toBeHidden();
});

test('forced colors mode has no serious a11y issues', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await open(page, 'retrograde');
  // The OS palette owns colour here. axe reads the authored text colours but the forced (Canvas)
  // backgrounds, so its contrast rule only reports false positives; every other rule still runs.
  expect(await seriousViolations(page, ['color-contrast'])).toEqual([]);
  // What forced colours must keep: the current track segment, painted with the system Highlight.
  const current = page.locator('.seg[data-seg="retrograde"]');
  await expect(current).toHaveCSS('forced-color-adjust', 'none');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the build-time bake is complete', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-phase', /^(direct|preshadow|retrograde|postshadow)$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.site.title);
    await expect(page.locator('[data-slot="phase-label"]')).not.toBeEmpty();
    await expect(page.locator('[data-slot="today"]')).toContainText('UTC');
    await expect(page.locator('.candle').first()).toBeVisible();
    await expect(page.locator('[data-slot="disclaimer"]')).toHaveText(copy.disclaimer.full);
  });
});
