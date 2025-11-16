import { useCallback, useRef } from 'react';

import commonStyles from '../styles/Common.module.scss';
import styles from './ShareBox.module.scss';

type ShareBoxProps = {
  shareUrl: string;
};

/**
 * 完成した結果をURLとしてコピーできる共有ボックス
 */
export default function ShareBox({ shareUrl }: ShareBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  /**
   * 共有URLをクリップボードへコピーする
   */
  const handleCopyShareUrl = useCallback(async () => {
    if (!navigator?.clipboard) {
      window.alert('この環境ではコピーできません。');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      window.alert('コピーしました。');
    } catch (cause) {
      window.alert((cause as Error).message);
    }
  }, [shareUrl]);

  /**
   * クリック時にURLをすべて選択する
   */
  const handleSelectAll = useCallback(() => {
    inputRef.current?.select();
  }, []);

  return (
    <div className={styles.shareBox}>
      <label htmlFor="share-url">共有用URL</label>
      <div className={styles.shareActions}>
        <input id="share-url" ref={inputRef} value={shareUrl} readOnly className={styles.shareInput} onClick={handleSelectAll} />
        <button type="button" className={`${commonStyles.button} ${styles.copyButton}`} onClick={handleCopyShareUrl}>
          コピー
        </button>
      </div>
    </div>
  );
}
