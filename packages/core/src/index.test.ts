import { describe, expect, it } from 'vitest';

import * as core from './index.js';

describe('package index exports', () => {
  it('exposes ExquisiteFishCorpseGame and types', () => {
    expect(typeof core.ExquisiteFishCorpseGame).toBe('function');
    expect(core).toHaveProperty('ExquisiteFishCorpseGame');
  });
});
