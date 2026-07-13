import type { RandomState } from './types.js';

const UINT32_RANGE = 4_294_967_296;

/** 数字だけのseedから先頭の0を取り除いて正規化する */
export function normalizeSeed(seed: string): string {
  if (!/^[0-9]+$/.test(seed)) {
    throw new Error('seedには数字だけを指定してください。');
  }
  return BigInt(seed).toString();
}

/** 正規化済みseedを32bit整数へ変換する */
export function hashSeed(seed: string): number {
  let hash = 2_166_136_261;
  for (const character of seed) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/** 現在時刻などから省略時のseedを作る */
export function createDefaultSeed(): string {
  return `${Date.now()}${process.pid}`;
}

/** 保存・復元可能なMulberry32乱数生成器を作る */
export function createStatefulRandom(state: RandomState): () => number {
  return () => {
    state.value = (state.value + 0x6d2b79f5) >>> 0;
    let value = state.value;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };
}
