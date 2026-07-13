import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import type { SnippetPosition } from '@exquisite-fish-corpse/core';

import { getFlag, getFlags, getNumberFlag, hasFlag, parseArguments, requireFlag } from './arguments.js';
import { answerChallenge, createGameState, ensureNextChallenge, restoreGame } from './game.js';
import { HELP_TEXT, LLM_HELP_TEXT } from './help.js';
import { createDefaultSeed } from './random.js';
import { readStateFile, writeStateFile } from './state-file.js';
import type { CliState, ParsedArguments, StoredGameOptions } from './types.js';

/** CLIのエントリーポイント */
async function main(): Promise<void> {
  const arguments_ = parseArguments(process.argv.slice(2));
  if (hasFlag(arguments_, 'llm')) {
    console.log(LLM_HELP_TEXT);
    return;
  }
  if (hasFlag(arguments_, 'help') || !arguments_.command) {
    console.log(HELP_TEXT);
    return;
  }

  switch (arguments_.command) {
    case 'new':
      await runNewCommand(arguments_);
      break;
    case 'next':
      await runNextCommand(arguments_);
      break;
    case 'answer':
      await runAnswerCommand(arguments_);
      break;
    case 'result':
      await runResultCommand(arguments_);
      break;
    case 'play':
      await runPlayCommand(arguments_);
      break;
    default:
      throw new Error(`不明なコマンドです: ${arguments_.command}`);
  }
}

/** 新規ゲームをstateファイルへ保存する */
async function runNewCommand(arguments_: ParsedArguments): Promise<void> {
  const statePath = requireFlag(arguments_, 'state');
  const seed = getFlag(arguments_, 'seed') ?? createDefaultSeed();
  const state = createGameState(seed, parseOptions(arguments_), parseInitialSnippets(arguments_));
  await writeStateFile(statePath, state);
  printOutput(arguments_, { status: 'created', state: statePath, seed: state.random.seed });
}

/** 次のお題を取得してstateファイルへ保存する */
async function runNextCommand(arguments_: ParsedArguments): Promise<void> {
  const statePath = requireFlag(arguments_, 'state');
  const state = await readStateFile(statePath);
  const challenge = ensureNextChallenge(state);
  await writeStateFile(statePath, state);

  const game = restoreGame(state);
  const status = challenge ? 'playing' : 'completed';
  printOutput(arguments_, { status, challenge, progress: game.getProgress() });
}

/** 現在提示中のお題へ回答する */
async function runAnswerCommand(arguments_: ParsedArguments): Promise<void> {
  const statePath = requireFlag(arguments_, 'state');
  const challengeId = requireFlag(arguments_, 'challenge-id');
  const content = requireFlag(arguments_, 'text');
  const state = await readStateFile(statePath);
  answerChallenge(state, challengeId, content);
  await writeStateFile(statePath, state);

  const game = restoreGame(state);
  const status = game.completed ? 'completed' : 'accepted';
  printOutput(arguments_, { status, progress: game.getProgress() });
}

/** 完成したゲームの結果を出力する */
async function runResultCommand(arguments_: ParsedArguments): Promise<void> {
  const state = await readStateFile(requireFlag(arguments_, 'state'));
  const game = restoreGame(state);
  if (!game.completed) {
    throw new Error('ゲームはまだ完成していません。');
  }
  printOutput(arguments_, { status: 'completed', ...game.getCompletedSentences() });
}

/** ターミナル上で新規ゲームを最後まで対話的に進める */
async function runPlayCommand(arguments_: ParsedArguments): Promise<void> {
  const statePath = requireFlag(arguments_, 'state');
  const seed = getFlag(arguments_, 'seed') ?? createDefaultSeed();
  const state = createGameState(seed, parseOptions(arguments_), parseInitialSnippets(arguments_));
  await writeStateFile(statePath, state);

  console.log(`seed: ${state.random.seed}`);
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    await playTurns(statePath, state, readline);
  } finally {
    readline.close();
  }
}

/** 対話モードの各ターンを完了まで繰り返す */
async function playTurns(
  statePath: string,
  state: CliState,
  readline: ReturnType<typeof createInterface>,
): Promise<void> {
  while (true) {
    const challenge = ensureNextChallenge(state);
    await writeStateFile(statePath, state);
    if (!challenge) {
      const result = restoreGame(state).getCompletedSentences();
      console.log('\n完成しました。');
      for (const sentence of result.sentences) {
        console.log(sentence.text);
      }
      return;
    }

    const prompt = challenge.direction === 'FOLLOWING' ? `${challenge.contentPart} [この後へ] ` : `[この前へ] ${challenge.contentPart} `;
    const content = await readline.question(prompt);
    answerChallenge(state, challenge.id, content);
    await writeStateFile(statePath, state);
  }
}

/** new/play用の初期断片を引数から組み立てる */
function parseInitialSnippets(arguments_: ParsedArguments): { position: SnippetPosition; content: string }[] {
  const snippets: { position: SnippetPosition; content: string }[] = [];
  appendSnippets(snippets, 'BEGINNING', getFlags(arguments_, 'beginning'));
  appendSnippets(snippets, 'MIDDLE', getFlags(arguments_, 'middle'));
  appendSnippets(snippets, 'END', getFlags(arguments_, 'end'));
  return snippets;
}

/** 同じ位置の初期断片を一覧へ追加する */
function appendSnippets(
  snippets: { position: SnippetPosition; content: string }[],
  position: SnippetPosition,
  contents: string[],
): void {
  for (const content of contents) {
    snippets.push({ position, content });
  }
}

/** coreへ渡すゲーム設定を引数から組み立てる */
function parseOptions(arguments_: ParsedArguments): StoredGameOptions {
  const maxTokensForNextPlayer = parsePositiveNumber(arguments_, 'max-tokens');
  const maxCharsForNextPlayer = parsePositiveNumber(arguments_, 'max-chars');
  const beginningSnippetProbability = parseProbability(arguments_, 'beginning-probability');
  const endingSnippetProbability = parseProbability(arguments_, 'ending-probability');
  const sentenceEndingPunctuations = getFlags(arguments_, 'punctuation');
  const options: StoredGameOptions = {};

  if (maxTokensForNextPlayer !== undefined) {
    options.maxTokensForNextPlayer = maxTokensForNextPlayer;
  }
  if (maxCharsForNextPlayer !== undefined) {
    options.maxCharsForNextPlayer = maxCharsForNextPlayer;
  }
  if (beginningSnippetProbability !== undefined) {
    options.beginningSnippetProbability = beginningSnippetProbability;
  }
  if (endingSnippetProbability !== undefined) {
    options.endingSnippetProbability = endingSnippetProbability;
  }
  if (sentenceEndingPunctuations.length > 0) {
    options.sentenceEndingPunctuations = sentenceEndingPunctuations;
  }
  return options;
}

/** 正の整数である設定値を読み込む */
function parsePositiveNumber(arguments_: ParsedArguments, name: string): number | undefined {
  const value = getNumberFlag(arguments_, name);
  if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
    throw new Error(`--${name} には正の整数を指定してください。`);
  }
  return value;
}

/** 0以上1以下の確率設定を読み込む */
function parseProbability(arguments_: ParsedArguments, name: string): number | undefined {
  const value = getNumberFlag(arguments_, name);
  if (value !== undefined && (value < 0 || value > 1)) {
    throw new Error(`--${name} には0以上1以下の数値を指定してください。`);
  }
  return value;
}

/** JSON指定に応じて機械向けまたは人間向けに結果を出す */
function printOutput(arguments_: ParsedArguments, value: Record<string, unknown>): void {
  if (hasFlag(arguments_, 'json')) {
    console.log(JSON.stringify(value));
    return;
  }
  console.log(JSON.stringify(value, null, 2));
}

main().catch((cause: unknown) => {
  const message = cause instanceof Error ? cause.message : String(cause);
  console.error(JSON.stringify({ status: 'error', error: message }));
  process.exitCode = 1;
});
