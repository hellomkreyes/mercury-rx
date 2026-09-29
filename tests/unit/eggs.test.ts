import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KONAMI, konami } from '../../src/eggs.ts';
import copy from '../../src/content/copy.json' with { type: 'json' };

const typed = (keys: string[]) => {
  const recent: string[] = [];
  return keys.map((k) => konami(recent, k)).at(-1);
};
const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'B', 'A'];

test('the Konami code completes, whatever the case', () => {
  assert.equal(typed(KONAMI), true);
  assert.equal(typed(CODE), true);
});

test('stray keys before it don’t matter; a wrong key inside it does', () => {
  assert.equal(typed(['ArrowUp', 'x', 'ArrowUp', ...CODE]), true);
  assert.equal(typed(['ArrowUp', ...CODE]), true); // ↑↑↑↓↓…
  assert.equal(typed([...CODE.slice(0, 5), 'x', ...CODE.slice(5)]), false);
});

test('every phase has a quest reward', () => {
  for (const phase of ['direct', 'preshadow', 'retrograde', 'postshadow'] as const) assert.ok(copy.eggs.quest.reward[phase]);
});
