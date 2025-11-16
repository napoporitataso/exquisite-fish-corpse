/**
 * `globalThis` が利用可能な場合はその参照を返す
 * @return グローバルオブジェクト（存在しない場合は`undefined`）
 */
function getGlobalObject(): typeof globalThis | undefined {
  if (typeof globalThis === 'undefined') {
    return undefined;
  }
  return globalThis;
}

/**
 * ブラウザが提供する `crypto` 実装を返す
 * @return `crypto` の参照（存在しない場合は`undefined`）
 */
function getBrowserCrypto(): Crypto | undefined {
  if (typeof crypto === 'undefined') {
    return undefined;
  }
  return crypto;
}

const internalAccessors = {
  getGlobalObject,
  getBrowserCrypto,
};

/**
 * 利用可能な `crypto` 実装を探索する
 * @return `crypto` 参照（存在しない場合は`undefined`）
 */
function resolveCrypto(): Crypto | undefined {
  const globalObject = internalAccessors.getGlobalObject();
  if (globalObject) {
    const globalCrypto = (globalObject as { crypto?: Crypto }).crypto;
    if (globalCrypto) {
      return globalCrypto;
    }
  }
  return internalAccessors.getBrowserCrypto();
}

/**
 * ブラウザ環境とNode.js環境の両方で動作するUUID生成関数
 * @returns UUID文字列
 */
export function randomUUID(): string {
  const cryptoImpl = resolveCrypto();
  if (cryptoImpl && typeof cryptoImpl.randomUUID === 'function') {
    return cryptoImpl.randomUUID();
  }
  throw new Error('UUIDを生成できる環境ではありません。');
}

/**
 * テスト用の内部フック
 */
export const __randomInternals = internalAccessors;
