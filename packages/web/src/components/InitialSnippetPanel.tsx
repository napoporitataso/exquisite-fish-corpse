import type { SnippetPosition } from '@exquisite-fish-corpse/core';
import { type FormEvent, useMemo, useState } from 'react';
import { POSITION_OPTIONS, PRESET_OPTIONS } from '../constants';
import commonStyles from '../styles/Common.module.scss';
import styles from './InitialSnippetPanel.module.scss';

const MAX_INITIAL_SNIPPETS_PER_POSITION = 5;
const MIN_INITIAL_SNIPPETS_PER_POSITION = 1;
const MAX_SNIPPET_LENGTH = 30;

// \u0000-\u001F: C0制御文字
// \u007F-\u009F: C1制御文字
// \u200E-\u200F: LRM, RLM
// \u202A-\u202E: 方向性制御文字
// \u2066-\u2069: 拡張方向性制御文字
const INVALID_CHAR_PATTERN = /[\u0000-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/;

type InitialSnippetPanelProps = {
  /**
   * 断片を追加するハンドラ
   */
  onAddSnippet: (content: string, position: SnippetPosition) => void;
  /**
   * ゲーム開始ハンドラ
   */
  onStartGame: (added: number) => void;
};

/**
 * 初期断片を登録するためのパネル
 */
export default function InitialSnippetPanel({ onAddSnippet, onStartGame }: InitialSnippetPanelProps) {
  const [textByPosition, setTextByPosition] = useState<Record<SnippetPosition, string>>({
    BEGINNING: '',
    MIDDLE: '',
    END: '',
  });
  const [presetId, setPresetId] = useState('custom');
  const [errors, setErrors] = useState<string[]>([]);

  const hasPendingInput = useMemo(() => Object.values(textByPosition).some((value) => value.trim().length > 0), [textByPosition]);

  /**
   * 断片を登録
   * @param event
   */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validation = validateInitialSnippets(textByPosition);
    if (validation.errors.length > 0) {
      setErrors(validation.errors);
      return;
    }

    const entriesByPosition = collectInitialSnippetEntries(textByPosition);
    let added = 0;
    for (const option of POSITION_OPTIONS) {
      for (const entry of entriesByPosition[option.value]) {
        onAddSnippet(entry, option.value);
        added += 1;
      }
    }

    if (added === 0) {
      setErrors(['断片を1つ以上入力してください。']);
      return;
    }

    setErrors([]);
    setTextByPosition({ BEGINNING: '', MIDDLE: '', END: '' });
    setPresetId('custom');
    onStartGame(added);
  };

  /**
   * プリセット変更
   * @param value
   * @returns
   */
  const handlePresetChange = (value: string) => {
    setPresetId(value);
    if (value === 'custom') {
      return;
    }
    const preset = PRESET_OPTIONS.find((option) => option.id === value);
    if (!preset) {
      return;
    }
    setTextByPosition({
      BEGINNING: preset.values.BEGINNING,
      MIDDLE: preset.values.MIDDLE,
      END: preset.values.END,
    });
  };

  return (
    <section className={commonStyles.card}>
      <p className={commonStyles.helperText}>
        文頭・文中・文末にあたる文章の断片を入力してください。改行区切りで複数の文章を入力できます。プリセットを選ぶと自動で入力されます。
      </p>

      <form className={styles.initialForm} onSubmit={handleSubmit}>
        <label className={`${styles.formLabel} ${styles.presetSelect}`}>
          プリセット
          <select value={presetId} onChange={(event) => handlePresetChange(event.target.value)}>
            <option value="custom">プリセットを選択</option>
            {PRESET_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.seedRows}>
          {POSITION_OPTIONS.map((option) => (
            <label key={option.value} className={`${styles.formLabel} ${styles.seedColumn}`}>
              <div>
                {option.label}
                <span className={styles.seedNote}>(5つまで, 各行30文字以内)</span>
              </div>
              <textarea
                rows={4}
                value={textByPosition[option.value]}
                onChange={(event) => setTextByPosition((prev) => ({ ...prev, [option.value]: event.target.value }))}
                placeholder={`例: ${option.value === 'BEGINNING' ? '昔々あるところに、' : option.value === 'MIDDLE' ? '大きな桃が' : 'めでたしめでたし'}`}
              />
            </label>
          ))}
        </div>

        <div className={commonStyles.formActions}>
          <div className={commonStyles.buttonGroup}>
            <button type="submit" className={`${commonStyles.button} ${commonStyles.primaryButton}`} disabled={!hasPendingInput}>
              この条件で開始
            </button>
          </div>
        </div>
        {errors.length > 0 && (
          <ul className={styles.errorList}>
            {errors.map((message) => (
              <li key={message} className={`${commonStyles.helperText} ${commonStyles.helperTextError}`}>
                {message}
              </li>
            ))}
          </ul>
        )}
      </form>
    </section>
  );
}

type PreparedEntries = Record<SnippetPosition, string[]>;

function validateInitialSnippets(textByPosition: Record<SnippetPosition, string>): { errors: string[] } {
  const errors: string[] = [];
  for (const option of POSITION_OPTIONS) {
    const trimmed = splitLines(textByPosition[option.value]);
    if (trimmed.length < MIN_INITIAL_SNIPPETS_PER_POSITION) {
      errors.push(`${option.label}の断片を最低${MIN_INITIAL_SNIPPETS_PER_POSITION}件入力してください。`);
    } else if (trimmed.length > MAX_INITIAL_SNIPPETS_PER_POSITION) {
      errors.push(`${option.label}の断片は最大${MAX_INITIAL_SNIPPETS_PER_POSITION}件までです。`);
    }

    for (const entry of trimmed) {
      const message = validateSnippetEntry(entry, option.label);
      if (message) {
        errors.push(message);
      }
    }
  }
  return { errors };
}

function collectInitialSnippetEntries(textByPosition: Record<SnippetPosition, string>): PreparedEntries {
  const entries: PreparedEntries = { BEGINNING: [], MIDDLE: [], END: [] };
  for (const option of POSITION_OPTIONS) {
    const trimmed = splitLines(textByPosition[option.value]);
    entries[option.value].push(...trimmed);
  }
  return entries;
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function validateSnippetEntry(entry: string, label: string): string | null {
  if ([...entry].length > MAX_SNIPPET_LENGTH) {
    return `${label}の断片は${MAX_SNIPPET_LENGTH}文字以内で入力してください。`;
  }
  if (INVALID_CHAR_PATTERN.test(entry)) {
    return `${label}の断片に改行や制御文字は使用できません。`;
  }
  return null;
}
