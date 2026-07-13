import type { NextChallenge, SerializedSingleExquisiteCorpseState, SingleExquisiteCorpseOptions } from '@exquisite-fish-corpse/core';

/** JSONへ保存できるゲーム設定 */
export type StoredGameOptions = Omit<SingleExquisiteCorpseOptions, 'random'>;

/** seed付き乱数生成器の保存状態 */
export type RandomState = {
  seed: string;
  value: number;
};

/** CLIが状態ファイルへ保存する内容 */
export type CliState = {
  version: 1;
  options: StoredGameOptions;
  random: RandomState;
  game: SerializedSingleExquisiteCorpseState;
  pendingChallenge: NextChallenge | null;
};

/** コマンドライン引数を単純化した解析結果 */
export type ParsedArguments = {
  command: string | null;
  values: Record<string, string | boolean | string[] | boolean[] | undefined>;
};
