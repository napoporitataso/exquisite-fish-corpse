import type { Snippet } from '../src';
import { ExquisiteFishCorpseGame } from '../src';

describe('ExquisiteFishCorpseGame', () => {
  it('getNextChallenge の direction に従わずに断片を追加するとエラーになること', () => {
    // 文頭断片だけを追加してゲームを開始
    const game = new ExquisiteFishCorpseGame({
      beginningSnippetProbability: 1,
      endingSnippetProbability: 1,
    });
    const first = game.addSnippet('BEGINNING', 'foo');

    // 後方断片を追加するよう出題される
    const challenge = game.getNextChallenge();
    expect(challenge).not.toBeNull();
    expect(challenge?.direction).toBe('FOLLOWING');

    // 前方断片を追加しようとするとエラーになる
    expect(() => {
      game.addPrecedingSnippet(first.id, 'bar');
    }).toThrowError();
  });

  it('完成していないのに getCompletedSentences するとエラーになること', () => {
    const game = new ExquisiteFishCorpseGame({
      beginningSnippetProbability: 1,
      endingSnippetProbability: 1,
    });
    game.addSnippet('BEGINNING', 'foo');

    expect(() => {
      game.getCompletedSentences();
    }).toThrowError();
  });

  it('ゲームを正しく完了できること', () => {
    // 文頭断片だけを追加してゲームを開始
    const game = new ExquisiteFishCorpseGame({
      beginningSnippetProbability: 1,
      endingSnippetProbability: 1,
    });
    const first = game.addSnippet('BEGINNING', 'foo');

    // 後方断片を追加するよう出題される
    const challenge = game.getNextChallenge();
    expect(challenge).not.toBeNull();
    expect(challenge?.direction).toBe('FOLLOWING');

    // 後方断片を追加するとゲーム終了
    const second = game.addFollowingSnippet(first.id, 'bar.');
    expect(second.position).toBe('END');
    expect(game.completed).toBe(true);
    expect(game.getNextChallenge()).toBeNull();

    // 完成した文章を取得できる
    const result = game.getCompletedSentences();
    expect(result.sentences.length).toBe(1);
    expect(result.sentences[0]?.text).toBe('foobar.');
  });

  it('前回のチャレンジで提示した断片を避けて出題されること', () => {
    const game = new ExquisiteFishCorpseGame({
      beginningSnippetProbability: 0,
      endingSnippetProbability: 0,
    });
    game.addSnippet('MIDDLE', 'abcdefghij');

    // 最初の出題
    const firstChallenge = game.getNextChallenge();
    expect(firstChallenge).not.toBeNull();
    expect(['PRECEDING', 'FOLLOWING']).toContain(firstChallenge?.direction);

    // 出題された断片に応じて断片を追加
    if (firstChallenge?.direction === 'PRECEDING') {
      game.addPrecedingSnippet(firstChallenge.id, 'abc');
    } else {
      game.addFollowingSnippet(firstChallenge!.id, 'hij');
    }

    // 次の出題は前回と異なる断片になるはず
    const secondChallenge = game.getNextChallenge();
    expect(secondChallenge).not.toBeNull();
    expect(secondChallenge?.id).not.toBe(firstChallenge?.id);
  });

  it('前回のチャレンジでユーザーが追加した断片を避けて出題されること', () => {
    const game = new ExquisiteFishCorpseGame({
      beginningSnippetProbability: 1,
      endingSnippetProbability: 1,
    });
    game.addSnippet('MIDDLE', 'abcdefghij');

    // 最初の出題
    const firstChallenge = game.getNextChallenge();
    expect(firstChallenge).not.toBeNull();
    expect(['PRECEDING', 'FOLLOWING']).toContain(firstChallenge?.direction);

    // 出題された断片に応じて断片を追加
    let addedSnippet: Snippet;
    if (firstChallenge?.direction === 'PRECEDING') {
      addedSnippet = game.addPrecedingSnippet(firstChallenge.id, 'abc');
    } else {
      addedSnippet = game.addFollowingSnippet(firstChallenge!.id, 'hij');
    }

    // 次の出題は、ユーザーが追加した断片とは異なる断片になるはず
    const secondChallenge = game.getNextChallenge();
    expect(secondChallenge).not.toBeNull();
    expect(secondChallenge?.id).not.toBe(addedSnippet.id);
  });

  it('接続が必要な全ての断片が漏れなく出題されること', () => {
    const game = new ExquisiteFishCorpseGame({
      beginningSnippetProbability: 0.5,
      endingSnippetProbability: 0.5,
    });
    const allSnippets: Snippet[] = [];

    allSnippets.push(game.addSnippet('BEGINNING', 'start'));
    allSnippets.push(game.addSnippet('MIDDLE', 'center'));
    allSnippets.push(game.addSnippet('END', 'finish'));

    for (let i = 0; ; ++i) {
      if (game.completed) {
        break;
      }
      const challenge = game.getNextChallenge();
      if (!challenge) {
        expect.fail('ゲームが完了していないのに出題が得られない');
      }
      if (challenge.direction === 'PRECEDING') {
        allSnippets.push(game.addPrecedingSnippet(challenge.id, `pre${i}`));
      } else if (challenge.direction === 'FOLLOWING') {
        allSnippets.push(game.addFollowingSnippet(challenge.id, `post${i}`));
      }
    }
    expect(game.completed).toBe(true);

    const progress = game.getProgress();
    expect(progress.openArms).toBe(0);

    // 追加した全ての断片IDが、完成した文章に1回ずつ含まれていること
    const result = game.getCompletedSentences();
    const allSnippetIds = allSnippets.map((s) => s.id);
    const usedSnippetIds = result.sentences
      .map((s) => s.snippets)
      .flat()
      .map((s) => s.id);
    expect(usedSnippetIds.sort()).toEqual(allSnippetIds.sort());
  });
});
