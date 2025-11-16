import commonStyles from '../styles/Common.module.scss';
import styles from './OpeningScreen.module.scss';

type OpeningScreenProps = {
  onStart: () => void;
};

/**
 * アプリ起動時にだけ表示するオープニング画面
 */
export default function OpeningScreen({ onStart }: OpeningScreenProps) {
  return (
    <section className={`${commonStyles.card} ${styles.openingScreen}`}>
      <h1 className={styles.openingScreenTitle}>優美な魚の屍骸</h1>
      <button className={`${commonStyles.button} ${commonStyles.primaryButton} ${styles.openingScreenButton}`} onClick={onStart}>
        開始
      </button>
    </section>
  );
}
