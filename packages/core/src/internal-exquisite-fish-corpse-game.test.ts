import { describe, expect, it } from 'vitest';

import { InternalExquisiteFishCorpseGame } from './internal-exquisite-fish-corpse-game.js';
import type {
  SerializedSingleExquisiteCorpseState,
  SingleExquisiteCorpseOptions,
  Token,
} from './types.js';

const simpleTokenizer = (content: string): Token[] => {
  const tokens = Array.from(content).map((char) => ({ surface: char }));

  if (tokens.length === 0) {
    throw new Error('tokenizer requires at least one character');
  }

  return tokens;
};

const createRandom = (values: number[]) => {
  let index = 0;
  const fallback = values.length > 0 ? values[values.length - 1]! : 0;

  return () => {
    if (index >= values.length) {
      return fallback;
    }

    const value = values[index]!;
    index += 1;

    return value;
  };
};

const createGame = (
  options: Partial<SingleExquisiteCorpseOptions> = {},
  randomValues: number[] = [],
  tokenizer: (content: string) => Token[] = simpleTokenizer,
) => {
  return new InternalExquisiteFishCorpseGame(
    {
      maxTokensForNextPlayer: 3,
      maxCharsForNextPlayer: 10,
      beginningSnippetProbability: 0.5,
      endingSnippetProbability: 0.5,
      ...options,
    },
    {
      random: createRandom(randomValues),
      tokenize: tokenizer,
    },
  );
};

describe('InternalExquisiteFishCorpseGame', () => {
  describe('getNextChallenge', () => {
    it('後方にしか繋げない断片は末尾の内容を提示する', () => {
      const game = createGame();
      game.addSnippet('BEGINNING', 'abcdef');

      const next = game.getNextChallenge();

      expect(next).not.toBeNull();
      expect(next?.direction).toBe('FOLLOWING');
      expect(next?.contentPart).toBe('def');
    });

    it('前後の両方向が開いている場合は乱数で方向が決まる', () => {
      const game = createGame({}, [0, 0.25]);
      game.addSnippet('MIDDLE', 'ghijkl');

      const next = game.getNextChallenge();

      expect(next).not.toBeNull();
      expect(next?.direction).toBe('PRECEDING');
      expect(next?.contentPart).toBe('ghi');
    });

    it('直前に作成した断片は次のチャレンジから除外される', () => {
      const game = createGame({ beginningSnippetProbability: 1, endingSnippetProbability: 0 }, [0]);
      const base = game.addSnippet('MIDDLE', 'core');
      const challenge = game.getNextChallenge();
      expect(challenge?.direction).toBe('PRECEDING');
      const created = game.addPrecedingSnippet(challenge!.id, 'start');

      const nextChallenge = game.getNextChallenge();
      expect(nextChallenge?.id).not.toBe(created.id);
      expect(nextChallenge?.id).toBe(base.id);
    });

    it('候補が除外され尽くすと次の出題は行われない', () => {
      const game = createGame({ beginningSnippetProbability: 1, endingSnippetProbability: 1 });
      const base = game.addSnippet('MIDDLE', 'core');
      game.addPrecedingSnippet(base.id, 'start');
      game.addFollowingSnippet(base.id, 'end.');

      expect(game.getNextChallenge()).toBeNull();
    });

    it('完成した文が増えると出題が終了する', () => {
      const game = createGame({ beginningSnippetProbability: 1, endingSnippetProbability: 1 });
      const head = game.addSnippet('BEGINNING', 'start');
      game.addFollowingSnippet(head.id, 'finish.');
      expect(game.getNextChallenge()).toBeNull();
    });

    it('完了扱いの文が開放断片を含む場合は出題されない', () => {
      const baseGame = createGame();
      baseGame.addSnippet('MIDDLE', 'core');
      const state = baseGame.serialize();
      state.completed = true;
      state.sentences[0]!.hasBeginning = true;
      state.sentences[0]!.hasEnd = true;

      const restored = createGame();
      restored.restoreFromSerializedState(state);

      expect(restored.getNextChallenge()).toBeNull();
    });

    it('復元直後は直前作成断片が未設定でもチャレンジを提示できる', () => {
      const baseGame = createGame();
      baseGame.addSnippet('MIDDLE', 'core');
      const state = baseGame.serialize();

      const restored = createGame();
      restored.restoreFromSerializedState(state);

      expect(restored.getNextChallenge()).not.toBeNull();
    });

    it('断片のプレビュー構築は長さに応じて出力を切り替える', () => {
      const gameFavorTokens = createGame({ maxTokensForNextPlayer: 1, maxCharsForNextPlayer: 10 }, [0]);
      gameFavorTokens.addSnippet('MIDDLE', 'abcdef');
      const tokenChallenge = gameFavorTokens.getNextChallenge();
      expect(tokenChallenge?.contentPart).toBe('a');

      const gameFavorChars = createGame({ maxTokensForNextPlayer: 5, maxCharsForNextPlayer: 2 }, [0]);
      gameFavorChars.addSnippet('MIDDLE', 'xy');
      const charChallenge = gameFavorChars.getNextChallenge();
      expect(charChallenge?.contentPart).toBe('xy');

      const trailingGame = createGame({ maxTokensForNextPlayer: 1, maxCharsForNextPlayer: 10 }, [0.8]);
      trailingGame.addSnippet('MIDDLE', 'abcdef');
      const trailingChallenge = trailingGame.getNextChallenge();
      expect(trailingChallenge?.direction).toBe('FOLLOWING');
      expect(trailingChallenge?.contentPart).toBe('f');
    });

  });

  describe('addFollowingSnippet', () => {
    it('文末断片を追加するとチェーンが完成扱いになる', () => {
      const game = createGame({ beginningSnippetProbability: 1, endingSnippetProbability: 1 });
      const first = game.addSnippet('BEGINNING', 'hello');
      const appended = game.addFollowingSnippet(first.id, 'world');

      expect(appended.position).toBe('END');
      expect(game.completed).toBe(true);
      expect(game.getNextChallenge()).toBeNull();
    });

    it('後方接続の制約を検証する', () => {
      const game = createGame({ beginningSnippetProbability: 1, endingSnippetProbability: 1 });
      const head = game.addSnippet('BEGINNING', 'start');
      const challenge = game.getNextChallenge();
      expect(challenge?.direction).toBe('FOLLOWING');
      const tail = game.addFollowingSnippet(head.id, 'end.');

      expect(() => game.addFollowingSnippet(head.id, 'again')).toThrowError('この断片にはすでに続きが存在します。');
      expect(() => game.addFollowingSnippet(tail.id, 'extra')).toThrowError('終端の断片には続きの断片を追加できません。');
    });

    it('句読点の設定がnullの場合は無視される', () => {
      const game = createGame({ sentenceEndingPunctuations: null as unknown as string[], endingSnippetProbability: 0 });
      const head = game.addSnippet('BEGINNING', '始まり。');
      const tail = game.addFollowingSnippet(head.id, '中間');

      expect(tail.position).toBe('MIDDLE');
    });

    it('空白のみの句読点リストは破棄される', () => {
      const game = createGame({ sentenceEndingPunctuations: [' ', '\t'], endingSnippetProbability: 0 });
      const head = game.addSnippet('BEGINNING', '始まり。');
      const tail = game.addFollowingSnippet(head.id, '中間');

      expect(tail.position).toBe('MIDDLE');
    });

    it('存在しない断片を指定するとエラーになる', () => {
      const game = createGame();
      expect(() => game.addFollowingSnippet('missing-snippet', 'x')).toThrowError('指定された断片(ID: missing-snippet)は存在しません。');
    });
  });

  describe('addPrecedingSnippet', () => {
    it('文頭断片を追加してチェーンを完成させられる', () => {
      const game = createGame({ beginningSnippetProbability: 1, endingSnippetProbability: 1 });
      const tail = game.addSnippet('END', 'xyz');
      const prepended = game.addPrecedingSnippet(tail.id, 'abc');

      expect(prepended.position).toBe('BEGINNING');
      expect(game.completed).toBe(true);
      expect(game.getNextChallenge()).toBeNull();
    });

    it('前方接続の制約を検証する', () => {
      const game = createGame({ beginningSnippetProbability: 1, endingSnippetProbability: 0 });
      const middle = game.addSnippet('MIDDLE', 'core');
      const appended = game.addPrecedingSnippet(middle.id, 'start');
      expect(() => game.addPrecedingSnippet(middle.id, 'before')).toThrowError('この断片にはすでに前段があります。');

      const beginning = game.addSnippet('BEGINNING', 'start');
      expect(() => game.addPrecedingSnippet(beginning.id, 'before')).toThrowError('文頭の断片には前段を追加できません。');
    });
  });

  describe('challenge direction handling', () => {
    it('提示された方向と異なる連結はエラーになる', () => {
      const game = createGame({}, [0]);
      const snippet = game.addSnippet('MIDDLE', 'core');
      const challenge = game.getNextChallenge();

      expect(challenge?.direction).toBe('PRECEDING');
      expect(() => game.addFollowingSnippet(snippet.id, '後ろ')).toThrowError('提示された方向と異なる操作です。');
      expect(() => game.addPrecedingSnippet(snippet.id, '前')).not.toThrow();
    });

    it('異なる断片への応答は検証をスキップする', () => {
      const game = createGame({ beginningSnippetProbability: 0, endingSnippetProbability: 0 });
      game.addSnippet('MIDDLE', 'alpha');
      const other = game.addSnippet('MIDDLE', 'beta');
      const challenge = game.getNextChallenge();
      expect(challenge).not.toBeNull();
      expect(() => game.addFollowingSnippet(other.id, 'gamma')).not.toThrow();
    });
  });

  describe('addSnippet', () => {
    it('断片の内容バリデーションが機能する', () => {
      const game = createGame();
      // @ts-expect-error 故意に非文字列を渡す
      expect(() => game.addSnippet('BEGINNING', 42)).toThrowError('断片の内容は文字列である必要があります。');
      expect(() => game.addSnippet('BEGINNING', '   ')).toThrowError('空の断片は追加できません。');
    });

    it('トークナイザは配列を返さないとエラーになる', () => {
      const game = createGame({}, [], () => null as unknown as Token[]);
      expect(() => game.addSnippet('BEGINNING', 'content')).toThrowError('トークナイザはトークン配列を返す必要があります。');
    });

    it('空のトークン配列は受け付けない', () => {
      const game = createGame({}, [], () => []);
      expect(() => game.addSnippet('BEGINNING', 'content')).toThrowError('空のトークン配列は使用できません。');
    });

    it('トークンの形式が不正な場合はエラーになる', () => {
      const game = createGame({}, [], () => [{ surface: 123 } as unknown as Token]);
      expect(() => game.addSnippet('BEGINNING', 'content')).toThrowError('トークンの形式が不正です。');
    });

    it('空白のみのトークンは拒否される', () => {
      const game = createGame({}, [], () => [{ surface: '   ' }]);
      expect(() => game.addSnippet('BEGINNING', 'content')).toThrowError('空のトークンは許可されていません。');
    });
  });

  describe('completed と getCompletedSentences', () => {
    it('文が存在しない場合はcompletedがfalseになる', () => {
      const game = createGame();
      expect(game.completed).toBe(false);
    });

    it('完成済みの文章と断片を取得できる', () => {
      const game = createGame({ beginningSnippetProbability: 1, endingSnippetProbability: 1 });
      const head = game.addSnippet('BEGINNING', '昔々');
      const tail = game.addFollowingSnippet(head.id, 'ありました');

      expect(game.completed).toBe(true);

      const completed = game.getCompletedSentences();
      expect(completed.sentences).toHaveLength(1);
      const [sentence] = completed.sentences;
      expect(sentence?.id).toEqual(expect.any(String));
      expect(sentence?.text).toBe('昔々ありました');
      expect(sentence?.snippets.map((snippet) => snippet.id)).toEqual([head.id, tail.id]);
    });
  });

  describe('serialize', () => {
    it('現在の状態をシリアライズできる', () => {
      const game = createGame({ beginningSnippetProbability: 1, endingSnippetProbability: 0 });
      const middle = game.addSnippet('MIDDLE', 'base');
      const head = game.addPrecedingSnippet(middle.id, 'head');
      const tail = game.addFollowingSnippet(middle.id, 'tail');

      const state = game.serialize();

      expect(state.completed).toBe(false);
      expect(state.openPrecedingSnippetIds).toEqual([]);
      expect(state.openFollowingSnippetIds).toEqual([tail.id]);
      expect(state.lastServedSnippetId).toBeNull();
      expect(state.snippets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: head.id,
            content: 'head',
            position: 'BEGINNING',
            previousSnippetId: null,
            nextSnippetId: middle.id,
          }),
          expect.objectContaining({
            id: middle.id,
            content: 'base',
            position: 'MIDDLE',
            previousSnippetId: head.id,
            nextSnippetId: tail.id,
          }),
          expect.objectContaining({
            id: tail.id,
            content: 'tail',
            position: 'MIDDLE',
            previousSnippetId: middle.id,
            nextSnippetId: null,
          }),
        ]),
      );
      expect(state.sentences).toHaveLength(1);
      const [sentence] = state.sentences;
      expect(sentence).toMatchObject({
        headId: head.id,
        tailId: tail.id,
        hasBeginning: true,
        hasEnd: false,
        snippetIds: [head.id, middle.id, tail.id],
      });

      const mutableSnippet = state.snippets.find((snippet) => snippet.id === middle.id);
      expect(mutableSnippet).toBeDefined();
      mutableSnippet!.tokens[0]!.surface = 'changed';

      const nextState = game.serialize();
      const middleAgain = nextState.snippets.find((snippet) => snippet.id === middle.id);
      expect(middleAgain?.tokens[0]?.surface).toBe('b');
    });
  });

  describe('restoreFromSerializedState', () => {
    it('シリアライズ済みの状態から復元できる', () => {
      const randomValues = [0.2, 0.8, 0.1, 0.9, 0.4, 0.6];
      const game = createGame({ beginningSnippetProbability: 1, endingSnippetProbability: 0 }, randomValues);
      const middle = game.addSnippet('MIDDLE', 'core');
      game.addPrecedingSnippet(middle.id, 'start');
      game.addFollowingSnippet(middle.id, 'trail');
      game.addSnippet('MIDDLE', 'solo');
      game.getNextChallenge();

      const state = game.serialize();

      const restored = createGame({ beginningSnippetProbability: 1, endingSnippetProbability: 0 });
      restored.restoreFromSerializedState(state);

      expect(restored.serialize()).toEqual(state);
    });

    describe('validation', () => {
      it('保存済み状態の開放IDが不正な場合は復元できない', () => {
        const game = createGame();
        const snippet = game.addSnippet('MIDDLE', 'core');
        const state = game.serialize();
        state.openPrecedingSnippetIds = [];

        expect(() => createGame().restoreFromSerializedState(state)).toThrowError('前方開放断片の情報が不正です。');

        state.openPrecedingSnippetIds = [snippet.id];
        state.openFollowingSnippetIds = [];

        expect(() => createGame().restoreFromSerializedState(state)).toThrowError('後方開放断片の情報が不正です。');
      });

      it('存在しない断片IDを最後に提示した場合は復元できない', () => {
        const game = createGame();
        game.addSnippet('MIDDLE', 'core');
        const state = game.serialize();
        state.lastServedSnippetId = 'unknown-id';

        expect(() => createGame().restoreFromSerializedState(state)).toThrowError('最後に提示した断片IDが存在しません。');
      });

      it('復元時に先頭断片の前段不整合を検出する', () => {
        const game = createGame();
        const snippet = game.addSnippet('MIDDLE', 'core');
        const state = game.serialize();
        const storedSnippet = state.snippets.find((entry) => entry.id === snippet.id)!;
        const sentenceId = state.sentences[0]!.id;

        storedSnippet.previousSnippetId = 'ghost';

        expect(() => createGame().restoreFromSerializedState(state)).toThrowError(
          `文(ID: ${sentenceId})の先頭断片(ID: ${snippet.id})に前段が存在します。`,
        );
      });

      it('復元時に末尾断片の後続不整合を検出する', () => {
        const game = createGame({ beginningSnippetProbability: 0, endingSnippetProbability: 0 });
        const base = game.addSnippet('MIDDLE', 'core');
        const tail = game.addFollowingSnippet(base.id, 'tail');
        const state = game.serialize();
        const storedTail = state.snippets.find((entry) => entry.id === tail.id)!;
        const sentenceId = state.sentences[0]!.id;

        storedTail.nextSnippetId = 'ghost';

        expect(() => createGame().restoreFromSerializedState(state)).toThrowError(
          `文(ID: ${sentenceId})の末尾断片(ID: ${tail.id})に続きがあります。`,
        );
      });

      it('復元時に前方開放IDの重複を検出する', () => {
        const game = createGame();
        const snippet = game.addSnippet('MIDDLE', 'core');
        const state = game.serialize();

        state.openPrecedingSnippetIds = [snippet.id, snippet.id];

        expect(() => createGame().restoreFromSerializedState(state)).toThrowError('前方開放断片の情報が不正です。 (重複を検出)');
      });

      it('復元時に後方開放IDの欠落を検出する', () => {
        const game = createGame();
        game.addSnippet('MIDDLE', 'core');
        const state = game.serialize();

        state.openFollowingSnippetIds = ['unknown-id'];

        expect(() => createGame().restoreFromSerializedState(state)).toThrowError('後方開放断片の情報が不正です。');
      });

      it('復元時に空の文が含まれているとエラーになる', () => {
        const game = createGame();
        game.addSnippet('MIDDLE', 'core');
        const state = game.serialize();

        const invalidState = {
          ...state,
          sentences: [
            ...state.sentences,
            { id: 'empty', headId: 'ghost', tailId: 'ghost', hasBeginning: false, hasEnd: false, snippetIds: [] },
          ],
        };

        expect(() => createGame().restoreFromSerializedState(invalidState)).toThrowError(
          '文(ID: empty)に断片が含まれていません。',
        );
      });

      it('復元時に存在しない断片を参照するとエラーになる', () => {
        const game = createGame();
        game.addSnippet('MIDDLE', 'core');
        const state = game.serialize();

        const invalidState = {
          ...state,
          sentences: [
            ...state.sentences,
            { id: 'phantom', headId: 'ghost', tailId: 'ghost', hasBeginning: false, hasEnd: false, snippetIds: ['ghost'] },
          ],
        };

        expect(() => createGame().restoreFromSerializedState(invalidState)).toThrowError(
          '文(ID: phantom)に存在しない断片(ID: ghost)が含まれています。',
        );
      });

      it('断片が複数の文に属している状態は復元できない', () => {
        const snippetId = 'duplicated';
        const token: Token = { surface: 'a' };
        const invalidState: SerializedSingleExquisiteCorpseState = {
          completed: false,
          snippets: [
            {
              id: snippetId,
              content: 'a',
              position: 'MIDDLE' as const,
              tokens: [token],
              previousSnippetId: null,
              nextSnippetId: null,
            },
          ],
          sentences: [
            {
              id: 's1',
              headId: snippetId,
              tailId: snippetId,
              hasBeginning: false,
              hasEnd: false,
              snippetIds: [snippetId],
            },
            {
              id: 's2',
              headId: snippetId,
              tailId: snippetId,
              hasBeginning: false,
              hasEnd: false,
              snippetIds: [snippetId],
            },
          ],
          openPrecedingSnippetIds: [snippetId],
          openFollowingSnippetIds: [snippetId],
          lastServedSnippetId: null,
        };

        expect(() => createGame().restoreFromSerializedState(invalidState)).toThrowError('断片(ID: duplicated)が複数の文に属しています。');
      });

      it('復元時に連結順序の破損を検出する', () => {
        const baseGame = createGame({ beginningSnippetProbability: 1, endingSnippetProbability: 0 });
        const middle = baseGame.addSnippet('MIDDLE', 'core');
        const head = baseGame.addPrecedingSnippet(middle.id, 'head');
        const tail = baseGame.addFollowingSnippet(middle.id, 'tail');
        const state = baseGame.serialize();

        const reordered = JSON.parse(JSON.stringify(state)) as SerializedSingleExquisiteCorpseState;
        const mutatedHead = reordered.snippets.find((snippet) => snippet.id === head.id)!;
        mutatedHead.nextSnippetId = 'broken';
        expect(() => createGame().restoreFromSerializedState(reordered)).toThrowError('連結順序が不正です。');

        const reversed = JSON.parse(JSON.stringify(state)) as SerializedSingleExquisiteCorpseState;
        const mutatedTail = reversed.snippets.find((snippet) => snippet.id === tail.id)!;
        mutatedTail.previousSnippetId = null;
        expect(() => createGame().restoreFromSerializedState(reversed)).toThrowError('逆連結順序が不正です。');
      });

      it('復元時に文の整合性の異常を検出する', () => {
        const baseGame = createGame();
        baseGame.addSnippet('MIDDLE', 'mid');
        const state = baseGame.serialize();

        const missingSnippetState = {
          ...state,
          sentences: [
            {
              ...state.sentences[0]!,
              headId: 'ghost',
              tailId: 'ghost',
              snippetIds: ['ghost'],
            },
          ],
        };
        expect(() => createGame().restoreFromSerializedState(missingSnippetState)).toThrowError(/断片/);

        const emptySentenceState = {
          ...state,
          sentences: [{ ...state.sentences[0]!, snippetIds: [] }],
        };
        expect(() => createGame().restoreFromSerializedState(emptySentenceState)).toThrowError(/断片/);

        const headMismatchState = {
          ...state,
          sentences: [{ ...state.sentences[0]!, headId: 'ghost' }],
        };
        expect(() => createGame().restoreFromSerializedState(headMismatchState)).toThrowError('先頭IDが不正です。');

        const tailMismatchState = {
          ...state,
          sentences: [{ ...state.sentences[0]!, tailId: 'ghost' }],
        };
        expect(() => createGame().restoreFromSerializedState(tailMismatchState)).toThrowError('末尾IDが不正です。');
      });

      it('復元時に断片の所有情報不足を検出する', () => {
        const game = createGame();
        game.addSnippet('MIDDLE', 'core');
        const state = game.serialize();
        state.sentences = [];
        expect(() => createGame().restoreFromSerializedState(state)).toThrowError(/断片/);
      });

      it('復元時に完成状態の不一致を検出する', () => {
        const game = createGame();
        game.addSnippet('MIDDLE', 'core');
        const state = game.serialize();
        state.completed = true;
        expect(() => createGame().restoreFromSerializedState(state)).toThrowError('完成状態が保存時と一致しません。');
      });
    });
  });
});
