import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePrefs } from '../../src/prefs.ts';

test('the OS setting applies until the visitor chooses', () => {
  assert.deepEqual(resolvePrefs({}, { hc: true, still: false }), { hc: true, still: false });
});

test('a stored choice wins, including an explicit "off"', () => {
  assert.deepEqual(resolvePrefs({ hc: false, still: true }, { hc: true, still: false }), { hc: false, still: true });
  assert.deepEqual(resolvePrefs({ still: false }, { hc: true, still: true }), { hc: true, still: false });
});
