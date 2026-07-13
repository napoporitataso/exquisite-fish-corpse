import { answerChallenge, createGameState, ensureNextChallenge, restoreGame } from './game.js';

const INITIAL_SNIPPETS = [
  { position: 'BEGINNING' as const, content: '始まりは' },
  { position: 'MIDDLE' as const, content: '冷蔵庫の中で' },
  { position: 'END' as const, content: '静かに眠った。' },
];

describe('CLI game state', () => {
  test('同じseedと初期断片から同じお題を選ぶ', () => {
    const firstState = createGameState('12345', {}, INITIAL_SNIPPETS);
    const secondState = createGameState('12345', {}, INITIAL_SNIPPETS);

    const firstChallenge = ensureNextChallenge(firstState);
    const secondChallenge = ensureNextChallenge(secondState);

    expect(firstChallenge?.contentPart).toBe(secondChallenge?.contentPart);
    expect(firstChallenge?.direction).toBe(secondChallenge?.direction);
  });

  test('回答するまでは同じお題を返す', () => {
    const state = createGameState('67890', {}, INITIAL_SNIPPETS);
    const firstChallenge = ensureNextChallenge(state);
    const randomValueAfterFirstChallenge = state.random.value;

    expect(ensureNextChallenge(state)).toEqual(firstChallenge);
    expect(state.random.value).toBe(randomValueAfterFirstChallenge);
  });

  test('提示されたIDへの回答だけを受け付ける', () => {
    const state = createGameState('123', {}, INITIAL_SNIPPETS);
    const challenge = ensureNextChallenge(state);
    if (!challenge) {
      throw new Error('お題が生成されませんでした。');
    }

    expect(() => answerChallenge(state, 'unknown', '回答です。')).toThrow('challenge-id');
    answerChallenge(state, challenge.id, '回答です。');

    expect(state.pendingChallenge).toBeNull();
    expect(restoreGame(state).getProgress().totalArms).toBeGreaterThan(0);
  });
});
