import assert from 'node:assert';

export function expect<T>(actual: T) {
  return {
    toBe(expected: unknown) {
      assert.strictEqual(actual, expected);
    },
    toEqual(expected: unknown) {
      assert.deepStrictEqual(actual, expected);
    },
    toBeGreaterThan(expected: number) {
      assert.ok(typeof actual === 'number' && actual > expected, `Expected ${actual} > ${expected}`);
    },
    toBeLessThan(expected: number) {
      assert.ok(typeof actual === 'number' && actual < expected, `Expected ${actual} < ${expected}`);
    },
    toContain(item: unknown) {
      if (Array.isArray(actual)) {
        assert.ok(actual.includes(item as never), `Expected array to contain ${item}`);
      } else if (typeof actual === 'string') {
        assert.ok(actual.includes(item as string), `Expected string to contain ${item}`);
      } else {
        throw new Error('toContain target must be array or string');
      }
    },
    toBeDefined() {
      assert.ok(actual !== undefined, 'Expected value to be defined');
    },
    toBeNull() {
      assert.strictEqual(actual, null);
    },
    toBeTruthy() {
      assert.ok(Boolean(actual), `Expected ${actual} to be truthy`);
    },
    toBeFalsy() {
      assert.ok(!Boolean(actual), `Expected ${actual} to be falsy`);
    },
  };
}
