import commonStyles from '../styles/Common.module.scss';
import type { DisplaySentence } from '../types';
import styles from './CompletedPanel.module.scss';
import SentenceList from './SentenceList';
import ShareBox from './ShareBox';

type CompletedPanelProps = {
  sentences: DisplaySentence[];
  onRestart: () => void;
  shareUrl: string | null;
};

/**
 * ゲーム終了後に結果を表示するパネル
 */
export default function CompletedPanel({ sentences, onRestart, shareUrl }: CompletedPanelProps) {
  return (
    <section className={commonStyles.card}>
      <h2>できあがり</h2>
      <div className={styles.completedPanel}>
        {sentences.length === 0 ? (
          <p className={commonStyles.helperText}>完成した文章はありませんでした。</p>
        ) : (
          <SentenceList sentences={sentences} />
        )}

        {shareUrl && <ShareBox shareUrl={shareUrl} />}

        <div className={commonStyles.formActions}>
          <button className={`${commonStyles.button} ${commonStyles.primaryButton}`} onClick={onRestart}>
            最初からやり直す
          </button>
        </div>
      </div>
    </section>
  );
}
