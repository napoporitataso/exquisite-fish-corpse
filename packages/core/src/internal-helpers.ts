import type { SnippetLinkDirection, Token } from './types.js';

/**
 * 正の整数を正規化する
 */
export function normalisePositiveInteger(value: number, fallback: number): number {
  if (Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return fallback;
}

/**
 * 確率値を正規化する
 */
export function normaliseProbability(value: number, fallback: number): number {
  if (Number.isFinite(value) && value >= 0 && value <= 1) {
    return value;
  }
  return fallback;
}

/**
 * 先頭のトークンを取得する
 */
export function pickFirstTokens(tokens: Token[], maxTokens: number): string {
  if (tokens.length === 0 || maxTokens <= 0) {
    return '';
  }
  return tokens.slice(0, maxTokens).map((token) => token.surface).join('');
}

/**
 * 最後のトークンを取得する
 */
export function pickLastTokens(tokens: Token[], maxTokens: number): string {
  if (tokens.length === 0 || maxTokens <= 0) {
    return '';
  }
  return tokens.slice(-maxTokens).map((token) => token.surface).join('');
}

/**
 * 先頭の文字列を取得する
 */
export function pickFirstCharacters(content: string, maxChars: number): string {
  if (!content || maxChars <= 0) {
    return '';
  }
  return Array.from(content).slice(0, maxChars).join('');
}

/**
 * 最後の文字列を取得する
 */
export function pickLastCharacters(content: string, maxChars: number): string {
  if (!content || maxChars <= 0) {
    return '';
  }
  return Array.from(content).slice(-maxChars).join('');
}

/**
 * 選択可能な方向からいずれかをランダムに選択する
 */
export function pickDirection(
  canAddPreceding: boolean,
  canAddFollowing: boolean,
  random: () => number,
): SnippetLinkDirection {
  if (canAddPreceding && canAddFollowing) {
    return random() < 0.5 ? 'PRECEDING' : 'FOLLOWING';
  }
  return canAddPreceding ? 'PRECEDING' : 'FOLLOWING';
}

/**
 * トークン優先・文字優先の結果からプレビューとして提示する文字列を選択する
 */
export function pickPreviewContent(tokensPart: string, charsPart: string): string {
  if (tokensPart.length === 0) {
    return charsPart;
  }
  if (charsPart.length === 0) {
    return tokensPart;
  }
  return tokensPart.length <= charsPart.length ? tokensPart : charsPart;
}

/**
 * 値の存在を保証し、欠けている場合はエラーにする
 */
export function assertPresent<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

/**
 * 文が完成扱いかどうかを検証する
 */
export function assertSentenceCompletion(hasBeginning: boolean, hasEnd: boolean): void {
  if (!(hasBeginning && hasEnd)) {
    throw new Error('未完成の文章は取得できません。');
  }
}

/**
 * 断片が指定された文に属しているか確認する
 */
export function assertSnippetOwnership(snippetSentenceId: string, sentenceId: string, snippetId: string): void {
  if (snippetSentenceId !== sentenceId) {
    throw new Error(`断片(ID: ${snippetId})の所属情報が不正です。`);
  }
}
