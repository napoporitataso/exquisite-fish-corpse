import styles from './GameDebugPanel.module.scss';

export type GameDebugEntry = {
  id: string;
  position: string;
  content: string;
  previous: string | null;
  next: string | null;
};

type GameDebugPanelProps = {
  entries: GameDebugEntry[];
};

/**
 * デバッグ用に断片の繋がりを一覧表示する
 */
export default function GameDebugPanel({ entries }: GameDebugPanelProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={styles.debugPanel}>
      <h3>DEBUG</h3>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            <div className={styles.debugLine}>
              <span className={styles.debugPosition}>[{entry.position}]</span>
              <span className={styles.debugContent}>{entry.content}</span>
            </div>
            <div className={styles.debugNeighbors}>
              <span>前: {entry.previous ?? 'なし'}</span>
              <span>後: {entry.next ?? 'なし'}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
