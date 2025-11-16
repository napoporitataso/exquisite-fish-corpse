import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

export const SHARE_HASH_PREFIX = '#share=';

const HASH_SEPARATOR = '.';

export type SharedSentenceMatrix = string[][];

/**
 * 共有用ハッシュを生成する
 * @param matrix 共有対象の文×スニペット配列
 * @return ハッシュフラグメント用のエンコード済み文字列
 */
export function encodeSharedSentences(matrix: SharedSentenceMatrix): string {
  const payload = JSON.stringify(matrix);
  const checksum = computeChecksum(payload);
  const compressed = compressToEncodedURIComponent(payload);
  if (!compressed) {
    throw new Error('共有データの圧縮に失敗しました。');
  }
  return `${checksum}${HASH_SEPARATOR}${compressed}`;
}

/**
 * 共有ハッシュから文×スニペット配列を復元する
 * @param encoded ハッシュ部分の文字列（プレフィックス除去済み）
 * @return 復元された配列（失敗時はnull）
 */
export function decodeSharedSentences(encoded: string): SharedSentenceMatrix | null {
  const [checksum, compressed] = encoded.split(HASH_SEPARATOR);
  if (!checksum || !compressed) {
    return null;
  }
  const payload = decompressFromEncodedURIComponent(compressed);
  if (!payload) {
    return null;
  }
  if (computeChecksum(payload) !== checksum) {
    return null;
  }
  try {
    const parsed = JSON.parse(payload);
    if (isSharedSentenceMatrix(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 共有データの簡易チェックサムを計算する
 * @param input チェックサム対象の文字列
 * @return 16進表現のチェックサム
 */
function computeChecksum(input: string): string {
  let sum = 0;
  for (const char of input) {
    const codePoint = char.codePointAt(0) ?? 0;
    sum = (sum + codePoint) % 65536;
  }
  return sum.toString(16).padStart(4, '0');
}

/**
 * 配列構造が共有形式と一致するか検証する
 * @param value 検証対象
 * @return 共有形式の場合はtrue
 */
function isSharedSentenceMatrix(value: unknown): value is SharedSentenceMatrix {
  return (
    Array.isArray(value) &&
    value.every((sentence) => Array.isArray(sentence) && sentence.every((snippet) => typeof snippet === 'string'))
  );
}
