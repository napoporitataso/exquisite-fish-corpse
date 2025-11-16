import { afterEach, describe, expect, it, vi } from 'vitest';

const originalIntl = globalThis.Intl;

describe('ExquisiteFishCorpseGame tokenizer safeguards', () => {
  afterEach(() => {
    globalThis.Intl = originalIntl;
    vi.resetModules();
  });

  it('throws when Intl.Segmenter is unavailable', async () => {
    globalThis.Intl = {} as Intl;
    const mod = await import('./exquisite-fish-corpse-game.js');
    expect(() => new mod.ExquisiteFishCorpseGame()).toThrowError('Intl.Segmenterが利用できません。トークナイザを提供してください。');
  });

  it('skips empty segments when tokenizing', async () => {
    class FakeSegmenter {
      segment() {
        return [{ segment: 'foo' }, { segment: '   ' }, { segment: 'bar' }];
      }
    }
    globalThis.Intl = { Segmenter: FakeSegmenter } as unknown as typeof Intl;
    const mod = await import('./exquisite-fish-corpse-game.js');
    const game = new mod.ExquisiteFishCorpseGame();
    const snippet = game.addSnippet('BEGINNING', 'ignored');
    expect(snippet.tokens.map((token) => token.surface)).toEqual(['foo', 'bar']);
  });

  it('throws when tokenization results in no content', async () => {
    class EmptySegmenter {
      segment() {
        return [{ segment: '   ' }];
      }
    }
    globalThis.Intl = { Segmenter: EmptySegmenter } as unknown as typeof Intl;
    const mod = await import('./exquisite-fish-corpse-game.js');
    const game = new mod.ExquisiteFishCorpseGame();
    expect(() => game.addSnippet('BEGINNING', 'content')).toThrowError('形態素解析の結果が空です。');
  });
});
