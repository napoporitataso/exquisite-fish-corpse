import type { ExquisiteCorpseProgress, NextChallenge } from '@exquisite-fish-corpse/core';
import { useState, type FormEvent } from 'react';

import commonStyles from '../styles/Common.module.scss';
import GameDebugPanel, { type GameDebugEntry } from './GameDebugPanel';
import styles from './GamePanel.module.scss';
import GameProgress from './GameProgress';

type GamePanelProps = {
  challenge: NextChallenge;
  onSubmit: (value: string) => void;
  progress: ExquisiteCorpseProgress;
  debugMode?: boolean;
  debugSnippets?: GameDebugEntry[] | null;
};

/**
 * ゲーム進行中の入力エリア
 */
const MAX_SNIPPET_LENGTH = 30;
const INVALID_CHAR_PATTERN = /[\u0000-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/;

export default function GamePanel({ challenge, onSubmit, progress, debugMode = false, debugSnippets }: GamePanelProps) {
  const [value, setValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    try {
      validateSnippetContent(trimmed);
      onSubmit(trimmed);
      setValue('');
      setInputError(null);
    } catch (cause) {
      setInputError((cause as Error).message);
    }
  };

  return (
    <section className={commonStyles.card}>
      <h2>選択的無意識</h2>

      <p className={commonStyles.helperText}>左右いずれかに表示された断片と繋がる文章を書いてください。</p>

      <form className={styles.gameForm} onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          {challenge.direction === 'FOLLOWING' && (
            <div className={`${styles.highlightedPhrase} ${styles.following}`}>{challenge.contentPart}</div>
          )}

          <input
            className={`${styles.input} ${challenge.direction === 'FOLLOWING' ? styles.inputFollowing : styles.inputPreceding}`}
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={challenge.direction === 'PRECEDING' ? '前に繋げる文章を入力' : '後ろに繋げる文章を入力'}
          />

          {challenge.direction === 'PRECEDING' && (
            <div className={`${styles.highlightedPhrase} ${styles.preceding}`}>{challenge.contentPart}</div>
          )}
        </div>

        <button type="submit" className={`${commonStyles.button} ${commonStyles.primaryButton}`}>
          この内容で追記する
        </button>
      </form>

      {inputError && <p className={`${commonStyles.helperText} ${commonStyles.helperTextError}`}>{inputError}</p>}
      <GameProgress progress={progress} />

      {debugMode && debugSnippets && <GameDebugPanel entries={debugSnippets} />}
    </section>
  );
}

function validateSnippetContent(value: string): void {
  if ([...value].length > MAX_SNIPPET_LENGTH) {
    throw new Error(`断片は${MAX_SNIPPET_LENGTH}文字以内で入力してください。`);
  }
  if (INVALID_CHAR_PATTERN.test(value)) {
    throw new Error(`改行や制御文字は使用できません。`);
  }
}
