import commonStyles from '../styles/Common.module.scss';
import type { DisplaySentence } from '../types';
import SentenceList from './SentenceList';
import styles from './SharedResultPanel.module.scss';

type SharedResultPanelProps = {
  sentences: DisplaySentence[];
  error: string | null;
  onBack: () => void;
};

/**
 * 共有URLから復元した文章を表示するパネル
 */
export default function SharedResultPanel({ sentences, error, onBack }: SharedResultPanelProps) {
  return (
    <section className={commonStyles.card}>
      <div className={styles.sharedResultPanel}>
        {error ? (
          <p className={styles.errorMessage}>{error}</p>
        ) : sentences.length === 0 ? (
          <p className={commonStyles.helperText}>共有された文章が含まれていませんでした。</p>
        ) : (
          <SentenceList sentences={sentences} />
        )}

        <div className={commonStyles.formActions}>
          <button className={`${commonStyles.button} ${commonStyles.primaryButton}`} onClick={onBack}>
            優美な魚の屍骸
          </button>
        </div>
      </div>
    </section>
  );
}
