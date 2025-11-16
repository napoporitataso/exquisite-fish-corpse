import { InternalExquisiteFishCorpseGame } from './internal-exquisite-fish-corpse-game.js';
import type {
  CompletedSentences,
  ExquisiteCorpseProgress,
  NextChallenge,
  SerializedSingleExquisiteCorpseState,
  SingleExquisiteCorpseOptions,
  Snippet,
  SnippetPosition,
  Token,
} from './types.js';

type TokenizeFunction = (content: string) => Token[];

const SEGMENTER: Intl.Segmenter | null =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('ja', { granularity: 'word' }) : null;

/**
 * 優美な屍骸クラスの公開API
 * 内部では InternalExquisiteFishCorpseGame に委譲する
 */
export class ExquisiteFishCorpseGame {
  private readonly internal: InternalExquisiteFishCorpseGame;

  constructor(options: SingleExquisiteCorpseOptions = {}) {
    this.internal = new InternalExquisiteFishCorpseGame(options, {
      random: () => Math.random(),
      tokenize: this.createTokenizer(),
    });
  }

  /**
   * シリアライズ済みの状態からゲームを復元する
   * @param state 保存済みの状態
   * @param options 復元時に利用するオプション
   */
  static deserialize(state: SerializedSingleExquisiteCorpseState, options: SingleExquisiteCorpseOptions = {}): ExquisiteFishCorpseGame {
    const game = new ExquisiteFishCorpseGame(options);
    game.internal.restoreFromSerializedState(state);
    return game;
  }

  /**
   * 優美な屍骸が完成しているかどうか
   */
  get completed(): boolean {
    return this.internal.completed;
  }

  /**
   * 任意の断片を追加する
   */
  addSnippet(position: SnippetPosition, content: string): Snippet {
    return this.internal.addSnippet(position, content);
  }

  /**
   * 次のプレイヤーに提示する断片を取得する
   */
  getNextChallenge(): NextChallenge | null {
    return this.internal.getNextChallenge();
  }

  /**
   * 指定した断片の後方に断片を連結する
   * @param targetSnippetId 連結対象の断片ID
   * @param content 追加する断片の内容
   * @return 追加された断片
   */
  addFollowingSnippet(targetSnippetId: string, content: string): Snippet {
    return this.internal.addFollowingSnippet(targetSnippetId, content);
  }

  /**
   * 指定した断片の前方に断片を連結する
   * @param targetSnippetId 連結対象の断片ID
   * @param content 追加する断片の内容
   * @return 追加された断片
   */
  addPrecedingSnippet(targetSnippetId: string, content: string): Snippet {
    return this.internal.addPrecedingSnippet(targetSnippetId, content);
  }

  /**
   * IDから断片を取得する
   */
  getSnippetById(snippetId: string): Snippet | null {
    return this.internal.getSnippetById(snippetId);
  }

  /**
   * 完成した全ての文章を取得する
   */
  getCompletedSentences(): CompletedSentences {
    return this.internal.getCompletedSentences();
  }

  /**
   * 接続の進捗を取得する
   */
  getProgress(): ExquisiteCorpseProgress {
    return this.internal.getProgress();
  }

  /**
   * 現在の状態をシリアライズする
   */
  serialize(): SerializedSingleExquisiteCorpseState {
    return this.internal.serialize();
  }

  /**
   * トークナイザを生成する
   */
  private createTokenizer(): TokenizeFunction {
    if (!SEGMENTER) {
      throw new Error('Intl.Segmenterが利用できません。トークナイザを提供してください。');
    }
    return (content) => {
      const tokens: Token[] = [];
      for (const segment of SEGMENTER.segment(content)) {
        const surface = segment.segment.trim();
        if (!surface) {
          continue;
        }
        tokens.push({ surface });
      }
      if (tokens.length === 0) {
        throw new Error('形態素解析の結果が空です。');
      }
      return tokens;
    };
  }
}
