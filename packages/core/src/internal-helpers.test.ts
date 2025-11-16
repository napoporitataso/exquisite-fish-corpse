import { describe, expect, it } from 'vitest';

import {
  assertPresent,
  assertSentenceCompletion,
  assertSnippetOwnership,
  normalisePositiveInteger,
  normaliseProbability,
  pickDirection,
  pickFirstCharacters,
  pickFirstTokens,
  pickLastCharacters,
  pickLastTokens,
  pickPreviewContent,
} from './internal-helpers.js';

import type { Token } from './types.js';

const sampleTokens: Token[] = [
  { surface: 'a' },
  { surface: 'b' },
  { surface: 'c' },
];

describe('internal helpers', () => {
  describe('normalisePositiveInteger', () => {
    it('正の整数はそのまま返す', () => {
      expect(normalisePositiveInteger(5, 1)).toBe(5);
    });

    it('不正値はフォールバックを返す', () => {
      expect(normalisePositiveInteger(-5, 7)).toBe(7);
      expect(normalisePositiveInteger(Number.NaN, 3)).toBe(3);
    });
  });

  describe('normaliseProbability', () => {
    it('0〜1の範囲であれば維持される', () => {
      expect(normaliseProbability(0.4, 0.1)).toBe(0.4);
    });

    it('範囲外の値はフォールバックを返す', () => {
      expect(normaliseProbability(2, 0.4)).toBe(0.4);
      expect(normaliseProbability(Number.NaN, 0.5)).toBe(0.5);
    });
  });

  describe('pickDirection', () => {
    it('乱数に応じて方向を返す', () => {
      const randomLow = () => 0.2;
      expect(pickDirection(true, true, randomLow)).toBe('PRECEDING');
      const randomHigh = () => 0.8;
      expect(pickDirection(true, true, randomHigh)).toBe('FOLLOWING');
      expect(pickDirection(true, false, randomLow)).toBe('PRECEDING');
      expect(pickDirection(false, true, randomLow)).toBe('FOLLOWING');
    });
  });

  describe('token/character pickers', () => {
    it('先頭と末尾のトークンを取得できる', () => {
      expect(pickFirstTokens(sampleTokens, 2)).toBe('ab');
      expect(pickLastTokens(sampleTokens, 1)).toBe('c');
    });

    it('文字数制限に基づいて抽出する', () => {
      expect(pickFirstCharacters('abcdef', 3)).toBe('abc');
      expect(pickLastCharacters('abcdef', 2)).toBe('ef');
    });

    it('空入力やゼロ指定に対応する', () => {
      expect(pickFirstTokens([], 3)).toBe('');
      expect(pickLastTokens([], 3)).toBe('');
      expect(pickFirstCharacters('', 3)).toBe('');
      expect(pickLastCharacters('', 3)).toBe('');
    });
  });

  describe('pickPreviewContent', () => {
    it('トークン優先・文字優先の結果から選択する', () => {
      expect(pickPreviewContent('', 'abc')).toBe('abc');
      expect(pickPreviewContent('tok', '')).toBe('tok');
      expect(pickPreviewContent('aa', 'bbbb')).toBe('aa');
      expect(pickPreviewContent('aaaa', 'bb')).toBe('bb');
    });
  });

  describe('assertPresent', () => {
    it('nullやundefinedを拒否する', () => {
      expect(assertPresent('value', 'missing')).toBe('value');
      expect(() => assertPresent(null, 'missing')).toThrowError('missing');
      expect(() => assertPresent(undefined, 'missing')).toThrowError('missing');
    });
  });

  describe('assertSentenceCompletion', () => {
    it('未完成の入力を拒否する', () => {
      expect(() => assertSentenceCompletion(false, true)).toThrowError('未完成の文章は取得できません。');
      expect(() => assertSentenceCompletion(true, false)).toThrowError('未完成の文章は取得できません。');
      expect(() => assertSentenceCompletion(true, true)).not.toThrow();
    });
  });

  describe('assertSnippetOwnership', () => {
    it('所属不整合を検出する', () => {
      expect(() => assertSnippetOwnership('sentence-a', 'sentence-b', 'snip')).toThrowError(/所属情報が不正です。/);
      expect(() => assertSnippetOwnership('sentence-a', 'sentence-a', 'snip')).not.toThrow();
    });
  });
});
