// @desktop: the two layouts that only exist on a big screen. Desktop Chromium only.
import { test, expect } from '@playwright/test';
import { button, copy, heed, konami, open } from './helpers.ts';

test.describe('desktop', { tag: '@desktop' }, () => {
  test('The Magician is bigger and still fits a 1280×720 screen, toast included', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await open(page);
    await konami(page);
    const dialog = (await page.getByRole('dialog').boundingBox())!;
    const card = (await page.locator('.summon .tarot').boundingBox())!;
    const toast = (await page.locator('.toast').boundingBox())!;
    expect(card.width).toBeGreaterThanOrEqual(230); // 160px (10rem) on phones
    expect(dialog.y).toBeGreaterThanOrEqual(0);
    expect(dialog.y + dialog.height).toBeLessThanOrEqual(720);
    expect(toast.y).toBeGreaterThanOrEqual(dialog.y + dialog.height);
  });

  test('the tooltip bubble hugs the ⓘ with its tail right under it', async ({ page }) => {
    await open(page);
    await heed(page);
    const icon = button(page, copy.oracle.whyNoResetLabel);
    await icon.click();
    const i = (await icon.boundingBox())!;
    const bubble = (await page.locator('#why-tip').boundingBox())!;
    expect(bubble.width).toBeLessThanOrEqual(28 * 16 + 1);
    expect(Math.abs(i.x + i.width - (bubble.x + bubble.width))).toBeLessThanOrEqual(2); // right edges line up
  });
});
