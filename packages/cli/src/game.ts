import { ExquisiteFishCorpseGame } from '@exquisite-fish-corpse/core';
import type { NextChallenge, SingleExquisiteCorpseOptions, SnippetPosition } from '@exquisite-fish-corpse/core';

import { createStatefulRandom, hashSeed, normalizeSeed } from './random.js';
import type { CliState, RandomState, StoredGameOptions } from './types.js';

const MAX_SNIPPET_LENGTH = 30;
const INVALID_CHARACTER_PATTERN = /[\u0000-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/;

/** 新しいCLIゲーム状態を作る */
export function createGameState(
  seed: string,
  options: StoredGameOptions,
  snippets: readonly { position: SnippetPosition; content: string }[],
): CliState {
  if (snippets.length === 0) {
    throw new Error('少なくとも1つの初期断片を指定してください。');
  }

  const normalizedSeed = normalizeSeed(seed);
  const randomState: RandomState = { seed: normalizedSeed, value: hashSeed(normalizedSeed) };
  const game = createGame(options, randomState);
  for (const snippet of snippets) {
    validateSnippetContent(snippet.content);
    game.addSnippet(snippet.position, snippet.content);
  }

  return {
    version: 1,
    options,
    random: randomState,
    game: game.serialize(),
    pendingChallenge: null,
  };
}

/** CLI状態からcoreゲームを復元する */
export function restoreGame(state: CliState): ExquisiteFishCorpseGame {
  const options = createCoreOptions(state.options, state.random);
  return ExquisiteFishCorpseGame.deserialize(state.game, options);
}

/** 未提示なら次のお題を作り、CLI状態へ記録する */
export function ensureNextChallenge(state: CliState): NextChallenge | null {
  if (state.pendingChallenge) {
    return state.pendingChallenge;
  }

  const game = restoreGame(state);
  const challenge = game.getNextChallenge();
  state.pendingChallenge = challenge;
  state.game = game.serialize();
  return challenge;
}

/** 提示中のお題に回答し、CLI状態を更新する */
export function answerChallenge(state: CliState, challengeId: string, content: string): void {
  const challenge = state.pendingChallenge;
  if (!challenge) {
    throw new Error('先に next を実行してお題を取得してください。');
  }
  if (challenge.id !== challengeId) {
    throw new Error('challenge-id が現在のお題と一致しません。');
  }

  validateSnippetContent(content);
  const game = restoreGame(state);
  if (challenge.direction === 'PRECEDING') {
    game.addPrecedingSnippet(challenge.id, content);
  } else {
    game.addFollowingSnippet(challenge.id, content);
  }
  state.pendingChallenge = null;
  state.game = game.serialize();
}

/** 保存可能な設定へ乱数生成関数を加える */
function createCoreOptions(options: StoredGameOptions, randomState: RandomState): SingleExquisiteCorpseOptions {
  return { ...options, random: createStatefulRandom(randomState) };
}

/** Web UIと同じ断片入力制約を検証する */
function validateSnippetContent(content: string): void {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('空の断片は追加できません。');
  }
  if ([...trimmed].length > MAX_SNIPPET_LENGTH) {
    throw new Error(`断片は${MAX_SNIPPET_LENGTH}文字以内で入力してください。`);
  }
  if (INVALID_CHARACTER_PATTERN.test(content)) {
    throw new Error('改行や制御文字は使用できません。');
  }
}

/** 指定設定と乱数状態からcoreゲームを作る */
function createGame(options: StoredGameOptions, randomState: RandomState): ExquisiteFishCorpseGame {
  return new ExquisiteFishCorpseGame(createCoreOptions(options, randomState));
}
