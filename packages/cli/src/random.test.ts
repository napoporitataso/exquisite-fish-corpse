import { createDefaultSeed, normalizeSeed } from './random.js';

describe('normalizeSeed', () => {
  test('数字だけのseedを受け付ける', () => {
    expect(normalizeSeed('123456789')).toBe('123456789');
  });

  test('先頭の0を取り除く', () => {
    expect(normalizeSeed('000123')).toBe('123');
    expect(normalizeSeed('000')).toBe('0');
  });

  test.each(['', '12a3', '-123', '+123', '1.5', ' 123'])('数字以外を含むseed「%s」を拒否する', (seed) => {
    expect(() => normalizeSeed(seed)).toThrow('数字だけ');
  });

  test('省略時のseedも数字だけで生成する', () => {
    expect(createDefaultSeed()).toMatch(/^[0-9]+$/);
  });
});
