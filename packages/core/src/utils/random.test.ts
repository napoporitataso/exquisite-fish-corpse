import { afterEach, describe, expect, it, vi } from 'vitest';

import { __randomInternals, randomUUID } from './random.js';

describe('randomUUID utility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses global crypto implementation when available', () => {
    const stub = vi.fn().mockReturnValue('uuid-from-global');
    vi.spyOn(__randomInternals, 'getGlobalObject').mockReturnValue({ crypto: { randomUUID: stub } as Crypto } as typeof globalThis);
    expect(randomUUID()).toBe('uuid-from-global');
    expect(stub).toHaveBeenCalledTimes(1);
  });

  it('falls back to browser crypto implementation if global is unavailable', () => {
    vi.spyOn(__randomInternals, 'getGlobalObject').mockReturnValue(undefined);
    const stub = vi.fn().mockReturnValue('uuid-from-browser');
    vi.spyOn(__randomInternals, 'getBrowserCrypto').mockReturnValue({ randomUUID: stub } as Crypto);
    expect(randomUUID()).toBe('uuid-from-browser');
  });

  it('throws when neither implementation exists', () => {
    vi.spyOn(__randomInternals, 'getGlobalObject').mockReturnValue(undefined);
    vi.spyOn(__randomInternals, 'getBrowserCrypto').mockReturnValue(undefined);
    expect(() => randomUUID()).toThrowError('UUIDを生成できる環境ではありません。');
  });

  it('getGlobalObject returns undefined when globalThis is missing', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error intentional override for test
    const originalGlobalThis = globalThis;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error intentional override for test
    globalThis = undefined;
    const result = __randomInternals.getGlobalObject();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error restoring override
    globalThis = originalGlobalThis;
    expect(result).toBeUndefined();
  });

  it('getBrowserCrypto returns undefined when crypto is missing', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
    const result = __randomInternals.getBrowserCrypto();
    if (descriptor) {
      Object.defineProperty(globalThis, 'crypto', descriptor);
    }
    expect(result).toBeUndefined();
  });

  it('getBrowserCrypto returns the global implementation when available', () => {
    expect(__randomInternals.getBrowserCrypto()).toBeDefined();
  });
});
