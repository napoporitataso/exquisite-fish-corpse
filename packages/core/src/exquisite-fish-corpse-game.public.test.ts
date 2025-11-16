import { describe, expect, it } from 'vitest';

import { ExquisiteFishCorpseGame } from './exquisite-fish-corpse-game.js';

describe('ExquisiteFishCorpseGame public API', () => {
  it('serialize/deserialize round-trip preserves state', () => {
    const game = new ExquisiteFishCorpseGame({
      beginningSnippetProbability: 1,
      endingSnippetProbability: 1,
    });
    const first = game.addSnippet('BEGINNING', '序');
    const challenge = game.getNextChallenge();
    expect(challenge).not.toBeNull();
    expect(challenge?.direction).toBe('FOLLOWING');
    const second = game.addFollowingSnippet(first.id, '破。');
    expect(second.position).toBe('END');

    const serialized = game.serialize();
    const restored = ExquisiteFishCorpseGame.deserialize(serialized, {
      beginningSnippetProbability: 1,
      endingSnippetProbability: 1,
    });

    expect(restored.serialize()).toEqual(serialized);
    expect(restored.getSnippetById(first.id)?.content).toBe('序');
  });

  it('reports progress updates when arms are closed', () => {
    const game = new ExquisiteFishCorpseGame({
      beginningSnippetProbability: 1,
      endingSnippetProbability: 1,
    });
    const head = game.addSnippet('BEGINNING', '始まり');
    const before = game.getProgress();
    expect(before.totalArms).toBe(1);
    expect(before.openArms).toBe(1);

    const challenge = game.getNextChallenge();
    expect(challenge).not.toBeNull();
    expect(challenge?.direction).toBe('FOLLOWING');
    game.addFollowingSnippet(head.id, '終わり。');

    const after = game.getProgress();
    expect(after.totalArms).toBe(2);
    expect(after.openArms).toBe(0);
  });

  it('counts both arms for middle snippets', () => {
    const game = new ExquisiteFishCorpseGame();
    game.addSnippet('MIDDLE', '中心');
    const progress = game.getProgress();
    expect(progress.totalArms).toBe(2);
    expect(progress.openArms).toBe(2);
  });

  it('returns null when snippet is not found', () => {
    const game = new ExquisiteFishCorpseGame();
    game.addSnippet('MIDDLE', '断片');
    expect(game.getSnippetById('missing-id')).toBeNull();
  });
});
