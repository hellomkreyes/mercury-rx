import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, save } from '../../src/storage.ts';

const withStorage = (storage: unknown, fn: () => void) => {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  try {
    fn();
  } finally {
    if (had) Object.defineProperty(globalThis, 'localStorage', had);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
};

test('round-trips JSON', () => {
  const map = new Map<string, string>();
  withStorage({ getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k, v) }, () => {
    save('k', { hc: true });
    assert.deepEqual(load('k', {}), { hc: true });
    assert.deepEqual(load('missing', { x: 1 }), { x: 1 });
  });
});

test('falls back when storage throws or holds junk', () => {
  const boom = () => {
    throw new Error('SecurityError');
  };
  withStorage({ getItem: boom, setItem: boom }, () => {
    assert.doesNotThrow(() => save('k', 1));
    assert.equal(load('k', 'fallback'), 'fallback');
  });
  withStorage({ getItem: () => '{not json', setItem() {} }, () => assert.equal(load('k', 'fallback'), 'fallback'));
});
