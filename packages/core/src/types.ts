export type SnippetPosition = 'BEGINNING' | 'MIDDLE' | 'END';

/**
 * シングルプレイヤー優美な屍骸のインスタンスが満たすべきインターフェース
 */
export type SingleExquisiteCorpseInstance = {
  /**
   * 優美な屍骸が完成しているかどうか
   * @return 完成している場合は`true`、そうでない場合は`false`
   */
  readonly completed: boolean;
  /**
   * 任意の断片を追加する
   * ゲーム開始時にのみ使用される想定
   * @param position 断片の位置（文頭・文中・文末）
   * @param content 断片の内容
   * @return 追加された断片
   */
  addSnippet(position: SnippetPosition, content: string): Snippet;
  /**
   * 続きの断片を追加する
   * ゲーム中に使用される想定
   *
   * 以下の終端判定を行う
   * - 乱数に基づき、`endingSnippetProbability` の確率で終端とする
   * - 断片の内容が `sentenceEndingPunctuations` の文字で終わる場合は必ず終端とする
   *
   * @param previousSnippetId 直前の断片のID
   * @param content 断片の内容
   * @return 追加された断片
   */
  addFollowingSnippet(previousSnippetId: string, content: string): Snippet;
  /**
   * 前の断片を追加する
   * ゲーム中に使用される想定
   *
   * 以下の始端判定を行う
   * - 乱数に基づき、`beginningSnippetProbability` の確率で始端とする
   *
   * @param nextSnippetId 直後の断片のID
   * @param content 断片の内容
   * @return 追加された断片
   */
  addPrecedingSnippet(nextSnippetId: string, content: string): Snippet;
  /**
   * 次のプレイヤーに提示する断片の一部を取得する
   * @return 断片の一部（存在しない場合は`null`）
   */
  getNextChallenge(): NextChallenge | null;
  /**
   * IDから断片を取得する
   * @param snippetId 取得対象のID
   * @return 断片（存在しない場合は`null`）
   */
  getSnippetById(snippetId: string): Snippet | null;
  /**
   * 接続の進捗を取得する
   * @return 接続可能な腕の集計結果
   */
  getProgress(): ExquisiteCorpseProgress;
  /**
   * 完成した全ての文章を取得する
   * @return 完成した文章
   */
  getCompletedSentences(): CompletedSentences;
  /**
   * 現在の状態をシリアライズする
   * @return シリアライズ済みのゲーム状態
   */
  serialize(): SerializedSingleExquisiteCorpseState;
};

/**
 * シングルプレイヤー
優美な屍骸のオプション
 */
export type SingleExquisiteCorpseOptions = {
  /**
   * 次のプレイヤーに提示する断片の最大トークン数
   * `maxCharsForNextPlayer` と併用時は短い方が優先されます
   * @default 3
   */
  maxTokensForNextPlayer?: number;
  /**
   * 次のプレイヤーに提示する断片の最大文字数
   * `maxTokensForNextPlayer` と併用時は短い方が優先されます
   * @default 10
   */
  maxCharsForNextPlayer?: number;
  /**
   * 手前に断片を追加した時に、始端として扱う確率
   * 0 < n <= 1の範囲で指定します（例: 0.2は20%の確率）
   * @default 0.3
   */
  beginningSnippetProbability?: number;
  /**
   * 後ろに断片を追加した時に、終端として扱う確率
   * 0 < n <= 1の範囲で指定します（例: 0.2は20%の確率）
   * @default 0.3
   */
  endingSnippetProbability?: number;
  /**
   * 文末とみなす句読点のリスト
   * 指定した場合、リストの文字で終わる断片は必ず終端として扱われます
   * 未指定の場合、終端判定は確率のみで行われます
   * @default ['。', '！', '？', '.', '!', '?']
   */
  sentenceEndingPunctuations?: string[];
};

/**
 * 優美な屍骸の断片
 */
export type Snippet = {
  /**
   * 断片ID (UUIDv4)
   */
  id: string;
  /**
   * 文頭・文中・文末のどこに位置するか
   */
  position: SnippetPosition;
  /**
   * 内容
   */
  content: string;
  /**
   * 形態素解析結果
   */
  tokens: Token[];
  /**
   * 直前の断片ID (存在しない場合は`null`)
   */
  previousSnippetId: string | null;
  /**
   * 直後の断片ID (存在しない場合は`null`)
   */
  nextSnippetId: string | null;
};

/**
 * 次のプレイヤーに提示する断片
 */
export type NextChallenge = {
  /**
   * 断片ID (UUIDv4)
   */
  id: string;
  /**
   * 内容の一部
   */
  contentPart: string;
  /**
   * 次はどちらの方向に繋げるか
   */
  direction: SnippetLinkDirection;
};

/**
 * どちらの方向に繋げるか
 */
export type SnippetLinkDirection = 'PRECEDING' | 'FOLLOWING';

/**
 * 形態素解析結果のトークン
 */
export type Token = {
  /**
   * 表層形
   */
  surface: string;
};

/**
 * 接続可能な腕の進捗
 */
export type ExquisiteCorpseProgress = {
  /**
   * まだ接続されていない腕の数
   */
  openArms: number;
  /**
   * 全体の腕の数
   */
  totalArms: number;
};

/**
 * 完成した文章
 */
export type CompletedSentences = {
  /**
   * 全ての文章
   */
  sentences: CompletedSentence[];
};

/**
 * 完成した文章の各要素
 */
export type CompletedSentence = {
  /**
   * 文のID
   */
  id: string;
  /**
   * 文章を構成する全ての断片
   */
  snippets: Snippet[];
  /**
   * 文のテキスト表現
   */
  text: string;
};

/**
 * シリアライズされた文の状態
 */
export type SerializedSentenceState = {
  /**
   * 文のID
   */
  id: string;
  /**
   * 先頭断片のID
   */
  headId: string;
  /**
   * 末尾断片のID
   */
  tailId: string;
  /**
   * 始端が確定しているか
   */
  hasBeginning: boolean;
  /**
   * 終端が確定しているか
   */
  hasEnd: boolean;
  /**
   * 先頭から末尾までの断片IDの順序
   */
  snippetIds: string[];
};

/**
 * シリアライズされたゲーム全体の状態
 */
export type SerializedSingleExquisiteCorpseState = {
  /**
   * ゲームが完成しているか
   */
  completed: boolean;
  /**
   * 断片の一覧
   */
  snippets: Snippet[];
  /**
   * 文ごとの状態
   */
  sentences: SerializedSentenceState[];
  /**
   * 前方が開いている断片ID
   */
  openPrecedingSnippetIds: string[];
  /**
   * 後方が開いている断片ID
   */
  openFollowingSnippetIds: string[];
  /**
   * 最後にプレイヤーへ提示した断片ID
   */
  lastServedSnippetId: string | null;
};
