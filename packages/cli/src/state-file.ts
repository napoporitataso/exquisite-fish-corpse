import { readFile, rename, writeFile } from 'node:fs/promises';

import type { CliState } from './types.js';

/** CLI状態ファイルを読み込む */
export async function readStateFile(path: string): Promise<CliState> {
  const content = await readFile(path, 'utf8');
  const state = JSON.parse(content) as Partial<CliState>;
  if (state.version !== 1 || !state.game || !state.random || !state.options) {
    throw new Error('対応していないstateファイルです。');
  }
  return state as CliState;
}

/** CLI状態を一時ファイル経由で安全に保存する */
export async function writeStateFile(path: string, state: CliState): Promise<void> {
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, path);
}
