/**
 * シングルプレイヤー優美な死骸
 */
export type SingleExquisiteCorpse = {
  new (options: SingleExquisiteCorpseOptions): SingleExquisiteCorpse;
  /**
   * 優美な死骸が完成しているかどうか
   * @return 完成している場合は`true`、そうでない場合は`false`
   */
  readonly completed: boolean;
  /**
   * 文頭の断片を追加する
   * @param content 断片の内容
   * @return 追加された断片
   */
  addBeginningSnippet(content: string): Snippet;
  /**
   * 続きの断片を追加する
   * 「。」「！」「？」で終わる場合は文末断片として追加される
   * @param beforeId 直前の断片のID
   * @param content 断片の内容
   * @return 追加された断片
   */
  addFollowingSnippet(beforeId: string, content: string): Snippet;
  /**
   * 次のプレイヤーに提示する断片の一部を取得する
   * @return 断片の一部（存在しない場合は`null`）
   */
  getSnippetForNextPlayer(): SnippetForNextPlayer | null;
};

/**
 * シングルプレイヤー優美な死骸のオプション
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
   * 文末とみなす句読点のリスト
   * @default ['。', '！', '？']
   */
  sentenceEndingPunctuations?: string[];
  /**
   * 形態素解析に使用する辞書のパス
   * @default 'node_modules/kuromoji/dict'
   */
  kuromojiDictPath?: string;
};

/**
 * 優美な死骸の断片
 */
export type Snippet = {
  /**
   * ID (UUIDv4)
   */
  id: string;
  /**
   * 文頭・文中・文末のどこに位置するか
   */
  position: 'BEGINNING' | 'MIDDLE' | 'END';
  /**
   * 内容
   */
  content: string;
  /**
   * 形態素解析結果
   */
  tokens: Token[];
};

/**
 * 次のプレイヤーに提示する断片
 */
export type SnippetForNextPlayer = {
  /**
   * ID (UUIDv4)
   */
  id: string;
  /**
   * 内容の一部
   */
  contentPart: string;
};

/**
 * 形態素解析結果のトークン
 */
export type Token = {
  /**
   * 表層形
   */
  surface: string;
};
