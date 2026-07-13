import type { ParseArgsOptionsConfig } from 'node:util';
import { parseArgs } from 'node:util';

import type { ParsedArguments } from './types.js';

const OPTIONS = {
  state: { type: 'string' },
  seed: { type: 'string' },
  beginning: { type: 'string', multiple: true },
  middle: { type: 'string', multiple: true },
  end: { type: 'string', multiple: true },
  'max-tokens': { type: 'string' },
  'max-chars': { type: 'string' },
  'beginning-probability': { type: 'string' },
  'ending-probability': { type: 'string' },
  punctuation: { type: 'string', multiple: true },
  'challenge-id': { type: 'string' },
  text: { type: 'string' },
  json: { type: 'boolean' },
  llm: { type: 'boolean' },
  help: { type: 'boolean' },
} as const satisfies ParseArgsOptionsConfig;

/** Node.js標準の引数パーサーでサブコマンドとオプションを解析する */
export function parseArguments(arguments_: string[]): ParsedArguments {
  const { positionals, values } = parseArgs({
    args: arguments_,
    options: OPTIONS,
    allowPositionals: true,
    strict: true,
  });

  if (positionals.length > 1) {
    throw new Error(`不明な引数です: ${positionals.slice(1).join(' ')}`);
  }
  return { command: positionals[0] ?? null, values };
}

/** 必須オプションを1件取得する */
export function requireFlag(arguments_: ParsedArguments, name: string): string {
  const value = getFlag(arguments_, name);
  if (!value) {
    throw new Error(`--${name} を指定してください。`);
  }
  return value;
}

/** 任意の文字列オプションを1件取得する */
export function getFlag(arguments_: ParsedArguments, name: string): string | undefined {
  const value = arguments_.values[name];
  return typeof value === 'string' ? value : undefined;
}

/** 複数指定可能な文字列オプションをすべて取得する */
export function getFlags(arguments_: ParsedArguments, name: string): string[] {
  const value = arguments_.values[name];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

/** booleanオプションが指定されたか調べる */
export function hasFlag(arguments_: ParsedArguments, name: string): boolean {
  return arguments_.values[name] === true;
}

/** 数値を表す文字列オプションを有限数として取得する */
export function getNumberFlag(arguments_: ParsedArguments, name: string): number | undefined {
  const value = getFlag(arguments_, name);
  if (value === undefined) {
    return undefined;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`--${name} には数値を指定してください。`);
  }
  return number;
}
