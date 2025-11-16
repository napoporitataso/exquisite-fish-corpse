import type { DisplaySentence } from '../types';
import styles from './SentenceList.module.scss';

type SentenceListProps = {
  sentences: DisplaySentence[];
};

/**
 * 完成した文章を断片ごとのチップで表示するリスト
 */
export default function SentenceList({ sentences }: SentenceListProps) {
  return (
    <ol className={styles.sentenceList}>
      {sentences.map((sentence) => (
        <li key={sentence.id}>
          <p className={styles.snippetChips}>
            {sentence.snippetTexts.map((snippet, index) => (
              <span key={`${sentence.id}-${index}`} className={styles.snippetChip}>
                {snippet}
              </span>
            ))}
          </p>
        </li>
      ))}
    </ol>
  );
}
