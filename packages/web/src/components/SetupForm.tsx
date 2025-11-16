import type { SingleExquisiteCorpseOptions } from '@exquisite-fish-corpse/core';
import { type FormEvent, useState } from 'react';
import commonStyles from '../styles/Common.module.scss';
import styles from './SetupForm.module.scss';

type SetupFormProps = {
  /**
   * フォーム送信時に呼ばれるハンドラ
   */
  onStart: (options: SingleExquisiteCorpseOptions) => void;
};

/**
 * ゲーム開始前にパラメーターを指定するフォーム
 */
export default function SetupForm({ onStart }: SetupFormProps) {
  const [maxTokens, setMaxTokens] = useState('3');
  const [maxChars, setMaxChars] = useState('5');
  const [beginningProb, setBeginningProb] = useState('0.3');
  const [endingProb, setEndingProb] = useState('0.3');
  const [punctuations, setPunctuations] = useState('。 ,！ ,？');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const options: SingleExquisiteCorpseOptions = {};
      const maxTokensValue = parsePositiveInteger(maxTokens);
      const maxCharsValue = parsePositiveInteger(maxChars);
      const beginningValue = parseProbability(beginningProb);
      const endingValue = parseProbability(endingProb);
      const punctuationList = parsePunctuationList(punctuations);

      if (maxTokensValue !== undefined) {
        options.maxTokensForNextPlayer = maxTokensValue;
      }

      if (maxCharsValue !== undefined) {
        options.maxCharsForNextPlayer = maxCharsValue;
      }

      if (beginningValue !== undefined) {
        options.beginningSnippetProbability = beginningValue;
      }

      if (endingValue !== undefined) {
        options.endingSnippetProbability = endingValue;
      }

      if (punctuationList) {
        options.sentenceEndingPunctuations = punctuationList;
      }

      onStart(options);
      setError(null);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <section className={commonStyles.card}>
      <h2>1. ゲーム設定</h2>
      <p className={commonStyles.helperText}>
        追記表示に使うトークンや文字数、始端/終端になる確率を調整できます。空欄の場合は既定値が使われます。
      </p>
      <form className={styles.formGrid} onSubmit={handleSubmit}>
        <label>
          次プレイヤーに見せる最大トークン数
          <input type="number" min="1" value={maxTokens} onChange={(event) => setMaxTokens(event.target.value)} placeholder="例: 3" />
        </label>
        <label>
          次プレイヤーに見せる最大文字数
          <input type="number" min="1" value={maxChars} onChange={(event) => setMaxChars(event.target.value)} placeholder="例: 7" />
        </label>
        <label>
          始端になる確率 (0〜1)
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={beginningProb}
            onChange={(event) => setBeginningProb(event.target.value)}
            placeholder="例: 0.3"
          />
        </label>
        <label>
          終端になる確率 (0〜1)
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={endingProb}
            onChange={(event) => setEndingProb(event.target.value)}
            placeholder="例: 0.3"
          />
        </label>
        <label className={styles.fullWidth}>
          文末とみなす句読点（空白またはカンマ区切り）
          <input type="text" value={punctuations} onChange={(event) => setPunctuations(event.target.value)} placeholder="例: 。 ！ ？" />
        </label>
        <div className={commonStyles.formActions}>
          <button type="submit" className={`${commonStyles.button} ${commonStyles.primaryButton}`}>
            ゲーム環境をつくる
          </button>
        </div>
        {error && <p className={`${commonStyles.helperText} ${commonStyles.helperTextError}`}>{error}</p>}
      </form>
    </section>
  );
}

function parsePositiveInteger(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error('正の整数を入力してください。');
  }

  return parsed;
}

function parseProbability(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }

  const parsed = Number.parseFloat(trimmed);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    throw new Error('確率は0以上1以下で入力してください。');
  }

  return parsed;
}

function parsePunctuationList(value: string): string[] | undefined {
  const tokens = value
    .split(/[, \n]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  return tokens.length > 0 ? tokens : undefined;
}
