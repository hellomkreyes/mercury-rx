// Everything else, once, in Chromium on a phone: the veil, the oracle's corners, motion, eggs, launch bits.
import { test, expect } from '@playwright/test';
import data from '../../src/content/cycles.json' with { type: 'json' };
import { button, changes, copy, heed, konami, open } from './helpers.ts';

const html = (page: import('@playwright/test').Page) => page.locator('html');

test.describe('the veil', () => {
  test('is remembered after you peer in, and "What am I looking at?" brings it back', async ({ page }) => {
    await open(page, { peered: false });
    const heading = page.getByRole('heading', { name: copy.veil.title });
    await expect(heading).toBeVisible();
    await button(page, copy.veil.cta).click();
    await expect(heading).toBeHidden();
    await expect(page.locator('.orb-svg')).toBeFocused();

    await page.reload();
    await expect(html(page)).toHaveAttribute('data-veil', 'off');
    await button(page, copy.veil.reopen).click();
    await expect(heading).toBeFocused();
    await expect(button(page, copy.veil.reopen)).toBeHidden();
  });

  test('holds GSAP back until you peer in', async ({ page }) => {
    const fetched: string[] = [];
    page.on('request', (r) => fetched.push(r.url()));
    await open(page, { motion: 'no-preference', peered: false, clock: 'install' });
    await page.clock.runFor(5000);
    expect(fetched.filter((u) => /orb-anim/.test(u))).toEqual([]);
    const lazy = page.waitForRequest(/orb-anim/);
    await button(page, copy.veil.cta).click();
    await page.clock.runFor(3500);
    await lazy;
  });
});

test('reduced motion: the orb shows today’s real sky, GSAP is never fetched and nothing animates', async ({ page }) => {
  const fetched: string[] = [];
  page.on('request', (r) => fetched.push(r.url()));
  await open(page, { clock: 'install' });
  await expect(page.locator('.orb-svg [data-sprite]')).toHaveCount(7);
  await expect(page.locator('.visually-hidden[data-slot="orb-status"]')).toHaveText(copy.orb.backward);
  await expect(page.locator('[data-orb="date"]')).toHaveText('Nov 1');
  const x = await page.locator('[data-sprite="mercury"]').getAttribute('x');
  await page.clock.runFor(5000);
  expect(fetched.filter((u) => /orb-anim/.test(u))).toEqual([]);
  expect(await page.locator('[data-sprite="mercury"]').getAttribute('x')).toBe(x);
  for (const el of ['.chip-dot', '.orb-float', '.flame']) await expect(page.locator(el).first()).toHaveCSS('animation-name', 'none');
});

test('motion on: the orb bobs, flames flicker and the simulated calendar runs ahead', async ({ page }) => {
  await open(page, { motion: 'no-preference', clock: 'install' });
  await expect(page.locator('.orb-float')).toHaveCSS('animation-name', 'bob');
  await expect(page.locator('.flame').first()).toHaveCSS('animation-name', 'flame');
  await page.clock.runFor(2500);
  await changes(page, () => page.locator('[data-orb="date"]').textContent(), 'Nov 1');
});

test.describe('the oracle', () => {
  test('arrow keys hop between choices', async ({ page }) => {
    await open(page);
    await button(page, copy.oracle.heed).focus();
    await page.keyboard.press('ArrowRight');
    await expect(button(page, copy.oracle.askAgain)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(button(page, copy.oracle.heed)).toBeFocused();
    await page.keyboard.press('End');
    await expect(button(page, copy.oracle.askAgain)).toBeFocused();
  });

  test('Ask again wraps the deck and types each card out', async ({ page }) => {
    await open(page, { motion: 'no-preference' });
    const cards = copy.phases.retrograde.oracle.cards;
    const card = page.locator('[data-slot="oracle-card"]');
    await button(page, copy.oracle.askAgain).focus();
    for (let i = 1; i <= cards.length; i++) {
      await page.keyboard.press('Enter');
      await expect(card.locator('.visually-hidden')).toHaveText(cards[i % cards.length]!);
      await expect(page.locator('[data-slot="oracle-count"]')).toHaveText(`Card ${(i % cards.length) + 1} of ${cards.length}`);
    }
    // Typewriter: every character is its own span, hidden from screen readers; any key finishes it.
    await expect(card.locator('.tw')).toHaveAttribute('aria-hidden', 'true');
    await expect(card.locator('.tw > span').last()).toHaveCSS('animation-name', 'type-in');
    await page.keyboard.press('Shift');
    await expect(card.locator('.tw > span').last()).toHaveCSS('animation-name', 'none');
  });

  test('the checklist: tooltip bubble, Esc order and focus', async ({ page }) => {
    await open(page, { at: '2026-10-12T12:00:00Z' });
    await heed(page);
    await expect(page.locator('#checklist-heading')).toHaveText('Seal these before the 24th');
    await expect(page.locator('#oracle')).toHaveAttribute('aria-labelledby', 'checklist-heading');

    const tip = button(page, copy.oracle.whyNoResetLabel);
    await tip.focus();
    await page.keyboard.press('Enter');
    await expect(tip).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#why-tip')).toHaveText(copy.oracle.whyNoReset);
    await expect(page.locator('#why-tip')).toHaveCSS('font-size', '24px');

    // First Esc closes the tip, the second the checklist; then Return works too.
    await page.keyboard.press('Escape');
    await expect(tip).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(button(page, copy.oracle.heed)).toBeFocused();
    await heed(page);
    await button(page, copy.oracle.back).click();
    await expect(button(page, copy.oracle.heed)).toBeFocused();
  });

  test('ticks clear when the next pre-shadow begins', async ({ page }) => {
    const oct = data.cycles.find((c) => c.stationRx.startsWith('2026-10'))!;
    const next = data.cycles[data.cycles.indexOf(oct) + 1]!;
    await open(page, { at: '2026-10-12T12:00:00Z' });
    await heed(page);
    await page.getByRole('checkbox').first().check();
    await open(page, { at: new Date(Date.parse(next.preShadow) + 86_400_000).toISOString() });
    await heed(page);
    await expect(page.getByRole('checkbox').first()).not.toBeChecked();
    await expect(page.locator('[data-slot="checklist-count"]')).toHaveText('0 of 4 sealed');
  });
});

test.describe('easter eggs', () => {
  test('Quest Complete: fires on the last tick only, loads the eggs only then, and Esc clears it', async ({ page }) => {
    const fetched: string[] = [];
    page.on('request', (r) => fetched.push(r.url()));
    await open(page);
    await heed(page);
    const boxes = await page.getByRole('checkbox').all();
    for (const box of boxes.slice(0, 3)) await box.check();
    expect(fetched.filter((u) => /egg-show/.test(u))).toEqual([]);

    await boxes[3]!.check();
    await expect(page.locator('.quest')).toBeVisible();
    await expect(page.locator('[data-egg-announce]')).toHaveText(`Quest complete! ${copy.eggs.quest.xp}, ${copy.eggs.quest.reward.retrograde}.`);
    await expect(boxes[3]!).toBeFocused();
    await expect(page.locator('.quest-badge')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.quest')).toHaveCount(0);
    await expect(page.locator('#checklist-heading')).toBeVisible();
    await boxes[0]!.uncheck();
    await expect(page.locator('.quest-badge')).toBeHidden();
  });

  test('Quest Complete with motion: letters bounce in, then it clears itself', async ({ page }) => {
    await open(page, { motion: 'no-preference', clock: 'install' });
    await heed(page);
    for (const box of await page.getByRole('checkbox').all()) await box.check();
    await expect(page.locator('.quest')).toBeVisible();
    await page.clock.runFor(1500);
    await expect(page.locator('.quest-title div, .quest-title span').first()).toBeAttached();
    await page.clock.runFor(4000);
    await expect(page.locator('.quest')).toHaveCount(0);
  });

  test('Konami with motion: the marker slides back and home; Dismiss works too', async ({ page }) => {
    await open(page, { motion: 'no-preference', clock: 'install' });
    const progress = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--progress')));
    const start = await progress();
    await konami(page);
    await expect.poll(async () => (await page.clock.runFor(250), progress())).toBeLessThan(start / 2);
    await page.clock.runFor(6000);
    expect(await progress()).toBeCloseTo(start, 2);
    await page.getByRole('button', { name: copy.eggs.konami.dismiss }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('Konami on a phone: swipe the code on the orb, then tap twice', async ({ page }) => {
    await open(page);
    await page.locator('.orb-svg').scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const orb = document.querySelector('.orb-svg')!;
      const r = orb.getBoundingClientRect();
      const [cx, cy] = [r.left + r.width / 2, r.top + r.height / 2];
      const touch = (x: number, y: number) => new Touch({ identifier: 1, target: orb, clientX: x, clientY: y });
      for (const [dx, dy] of [[0, -80], [0, -80], [0, 80], [0, 80], [-80, 0], [80, 0], [-80, 0], [80, 0], [0, 0], [0, 0]] as const) {
        orb.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [touch(cx, cy)], bubbles: true }));
        orb.dispatchEvent(new TouchEvent('touchend', { changedTouches: [touch(cx + dx, cy + dy)], bubbles: true }));
      }
    });
    await expect(page.getByRole('dialog', { name: copy.eggs.konami.name })).toBeVisible();
  });
});

test('the realm gate frames the orb and steps aside in high contrast', async ({ page }) => {
  await open(page);
  const parts = ['.gate', '.pedestal', '.gate-candles-l', '.gate-candles-r'];
  for (const part of parts) await expect(page.locator(part)).toBeVisible();
  await page.getByRole('button', { name: copy.toggles.contrast }).click();
  for (const part of parts) await expect(page.locator(part)).toBeHidden();
});

test('link previews: meta tags, share card and favicons are served', async ({ page, request }) => {
  await open(page);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', copy.site.title);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https:\/\/rx\.chibimuere\.com\/og\.png(\?v=\d{4}-\d{2}-\d{2})?$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  for (const [path, type] of [['/og.png', 'image/png'], ['/favicon.svg', 'image/svg+xml'], ['/favicon-32.png', 'image/png'], ['/apple-touch-icon.png', 'image/png']] as const) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()['content-type'], path).toContain(type);
  }
});

test('screenshot gallery: every phase, both themes, phone and desktop', async ({ page }, testInfo) => {
  const dates = { direct: '2026-09-28T12:00:00Z', preshadow: '2026-10-12T12:00:00Z', retrograde: '2026-11-01T12:00:00Z', postshadow: '2026-11-20T12:00:00Z' };
  for (const [phase, at] of Object.entries(dates)) {
    for (const theme of ['default', 'hc']) {
      await open(page, { at });
      await expect(html(page)).toHaveAttribute('data-phase', phase);
      if (theme === 'hc') await page.getByRole('button', { name: copy.toggles.contrast }).click();
      await page.evaluate(() => document.fonts.ready);
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await testInfo.attach(`${phase}-${theme}-${width}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
      }
      await page.evaluate(() => localStorage.removeItem('mrx:prefs'));
    }
  }
});

