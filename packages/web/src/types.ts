/**
 * 完成文の表示用構造
 */
export type DisplaySentence = {
  /**
   * 識別子
   */
  id: string;
  /**
   * 接続済みテキスト
   */
  text: string;
  /**
   * 各断片のテキスト
   */
  snippetTexts: string[];
};
