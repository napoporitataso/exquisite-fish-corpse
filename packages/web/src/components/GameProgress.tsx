import type { ExquisiteCorpseProgress } from '@exquisite-fish-corpse/core';

import styles from './GameProgress.module.scss';

type GameProgressProps = {
  progress: ExquisiteCorpseProgress;
};

/**
 * 進捗バーと残り接続部の内訳を表示する
 */
export default function GameProgress({ progress }: GameProgressProps) {
  const completedConnections = Math.max(progress.totalArms - progress.openArms, 0);

  return (
    <div className={styles.progressPanel}>
      <div className={styles.progressLabel}>
        <span>進捗</span>
        <span>
          接続完了: {completedConnections} / {progress.totalArms}
        </span>
      </div>
      <div className={styles.progressTrack} role="progressbar" aria-valuenow={completedConnections} aria-valuemax={progress.totalArms}>
        <div
          className={styles.progressFill}
          style={{
            width: progress.totalArms === 0 ? '0%' : `${(completedConnections / progress.totalArms) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
