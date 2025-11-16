import type {
  CompletedSentence,
  ExquisiteCorpseProgress,
  NextChallenge,
  SingleExquisiteCorpseOptions,
  SnippetPosition,
} from '@exquisite-fish-corpse/core';
import { ExquisiteFishCorpseGame } from '@exquisite-fish-corpse/core';
import { useCallback, useEffect, useState } from 'react';

import styles from './App.module.scss';
import CompletedPanel from './components/CompletedPanel';
import GamePanel from './components/GamePanel';
import InitialSnippetPanel from './components/InitialSnippetPanel';
import OpeningScreen from './components/OpeningScreen';
import SharedResultPanel from './components/SharedResultPanel';
import { useDebug } from './hooks/useDebug';
import type { DisplaySentence } from './types';
import { decodeSharedSentences, encodeSharedSentences, SHARE_HASH_PREFIX } from './utils/share';

const Mode = {
  Opening: 1,
  Initial: 2,
  Playing: 3,
  Completed: 4,
  SharedView: 5,
} as const;
type Mode = (typeof Mode)[keyof typeof Mode];

const DEFAULT_OPTIONS: SingleExquisiteCorpseOptions = {
  maxTokensForNextPlayer: 3,
  maxCharsForNextPlayer: 5,
  beginningSnippetProbability: 0.5,
  endingSnippetProbability: 0.5,
  sentenceEndingPunctuations: ['。', '！', '？', '.', '!', '?'],
};

/**
 * Web UI 全体を司るトップレベルコンポーネント
 */
export default function App() {
  const [mode, setMode] = useState<Mode>(Mode.Initial);
  const [game, setGame] = useState(() => new ExquisiteFishCorpseGame(DEFAULT_OPTIONS));
  const [progress, setProgress] = useState<ExquisiteCorpseProgress>(() => game.getProgress());
  const [initialSnippetCount, setInitialSnippetCount] = useState(0);
  const [challenge, setChallenge] = useState<NextChallenge | null>(null);
  const [completedSentences, setCompletedSentences] = useState<DisplaySentence[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharedSentences, setSharedSentences] = useState<DisplaySentence[] | null>(null);
  const [sharedDataError, setSharedDataError] = useState<string | null>(null);
  const { debugMode, debugSnippets } = useDebug(game, [progress, initialSnippetCount, challenge, mode]);

  /**
   * オープニング画面から初期入力画面へ遷移する
   */
  const handleEnterInitialMode = useCallback(() => {
    setMode(Mode.Initial);
    setError(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!window.location.hash.startsWith(SHARE_HASH_PREFIX)) {
      return;
    }
    const encoded = window.location.hash.slice(SHARE_HASH_PREFIX.length);
    const sharedMatrix = decodeSharedSentences(encoded);
    if (!sharedMatrix) {
      setSharedSentences(null);
      setSharedDataError('共有データを読み取れませんでした。');
    } else {
      const shared = createDisplaySentencesFromMatrix(sharedMatrix);
      setSharedSentences(shared);
      setSharedDataError(null);
    }
    setMode(Mode.SharedView);
    setChallenge(null);
    setShareUrl(window.location.href);
    setError(null);
  }, []);

  /**
   * すべての文が完成した際の処理
   */
  const finalizeGame = useCallback(() => {
    const sentences = game.getCompletedSentences();
    const displaySentences = createDisplaySentencesFromCompleted(sentences.sentences);
    setCompletedSentences(displaySentences);
    setMode(Mode.Completed);
    setChallenge(null);
    setError(null);
    const nextShareUrl = persistShareHash(displaySentences);
    setShareUrl(nextShareUrl);
  }, [game]);

  /**
   * コアライブラリから次のチャレンジを取得する
   */
  const requestNextChallenge = useCallback(() => {
    const nextChallenge = game.getNextChallenge();
    if (!nextChallenge) {
      finalizeGame();
      return;
    }

    setChallenge(nextChallenge);
    setMode(Mode.Playing);
    setError(null);
  }, [finalizeGame, game]);

  /**
   * 初期断片を追加する
   */
  const handleInitialSnippet = useCallback(
    (content: string, position: SnippetPosition) => {
      try {
        game.addSnippet(position, content);
        setInitialSnippetCount((count) => count + 1);
        setProgress(game.getProgress());
        setError(null);
      } catch (cause) {
        setError((cause as Error).message);
      }
    },
    [game],
  );

  /**
   * 初期入力を終えてゲームを開始する
   */
  const handleStartGame = useCallback(
    (added: number) => {
      const totalSeeds = initialSnippetCount + added;
      if (totalSeeds === 0) {
        setError('少なくとも1つの断片を登録してください。');
        return;
      }
      setError(null);
      requestNextChallenge();
    },
    [initialSnippetCount, requestNextChallenge],
  );

  /**
   * ゲーム中の入力を反映する
   */
  const handleGameInput = useCallback(
    (content: string) => {
      if (!challenge) {
        return;
      }
      try {
        if (challenge.direction === 'PRECEDING') {
          game.addPrecedingSnippet(challenge.id, content);
        } else {
          game.addFollowingSnippet(challenge.id, content);
        }
        setProgress(game.getProgress());
        setError(null);
      } catch (cause) {
        setError((cause as Error).message);
        return;
      }

      requestNextChallenge();
    },
    [challenge, game, requestNextChallenge],
  );

  /**
   * 再スタート
   */
  const handleRestart = useCallback(() => {
    setMode(Mode.Initial);
    const nextGame = new ExquisiteFishCorpseGame(DEFAULT_OPTIONS);
    setGame(nextGame);
    setProgress(nextGame.getProgress());
    setChallenge(null);
    setCompletedSentences([]);
    setInitialSnippetCount(0);
    clearShareHash();
    setShareUrl(null);
    setSharedSentences(null);
    setSharedDataError(null);
    setError(null);
  }, []);

  /**
   * 共有表示から通常画面へ戻る
   */
  const handleExitSharedView = useCallback(() => {
    setMode(Mode.Initial);
    clearShareHash();
    setShareUrl(null);
    setSharedSentences(null);
    setSharedDataError(null);
    setError(null);
  }, []);

  return (
    <div className={styles.appShell}>
      {(mode === Mode.Initial || mode === Mode.Completed) && (
        <header className={`${styles.header} ${styles.headerLogo}`}>
          <button onClick={handleRestart} type="button">
            <h1>優美な魚の屍骸</h1>
          </button>
        </header>
      )}
      {mode === Mode.Playing && (
        <header className={`${styles.header} ${styles.headerPlaying}`}>
          <button onClick={handleRestart} type="button">
            リセット
          </button>
        </header>
      )}

      <main className={styles.singleColumn}>
        {mode === Mode.Opening && <OpeningScreen onStart={handleEnterInitialMode} />}

        {mode === Mode.Initial && <InitialSnippetPanel onAddSnippet={handleInitialSnippet} onStartGame={handleStartGame} />}

        {mode === Mode.Playing && challenge && (
          <GamePanel
            challenge={challenge}
            onSubmit={handleGameInput}
            progress={progress}
            debugSnippets={debugSnippets}
            debugMode={debugMode}
          />
        )}

        {mode === Mode.Completed && <CompletedPanel sentences={completedSentences} onRestart={handleRestart} shareUrl={shareUrl} />}

        {mode === Mode.SharedView && (
          <SharedResultPanel sentences={sharedSentences ?? []} error={sharedDataError} onBack={handleExitSharedView} />
        )}

        {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}
      </main>

      <footer>
        <ul className={styles.footerList}>
          <li>
            <details>
              <summary>優美な屍骸とは</summary>
              <div>
                <p>
                  「優美な屍骸」は、シュルレアリスムの作品制作手法の一つ。本来は複数の作者がランダムに詩や絵の断片を作って繋げることで、予測不可能な作品を作るというもの。
                </p>
                <p>
                  この「優美な魚の屍骸」は、その手法を取り入れて、一人で偶然性の高いテキストを生成できるようにしたもの。テキストだが、絵でやる場合と同じように接続部分を少しだけ見せるのが特徴。
                </p>
              </div>
            </details>
          </li>
        </ul>
        <ul className={styles.footerMiscList}>
          <li>
            <a href="https://github.com/napoporitataso/exquisite-fish-corpse">ソースコード</a>
          </li>
          <li>v1.0.0</li>
          <li>
            <a href="https://wwv.kiriukun.com/">Webサイト</a>
          </li>
        </ul>
      </footer>
    </div>
  );
}

/**
 * 完了済みデータを表示用構造に変換する
 * @param sentences コアライブラリの完成済み文
 * @return 表示用構造
 */
function createDisplaySentencesFromCompleted(sentences: CompletedSentence[]): DisplaySentence[] {
  return sentences.map((sentence) => ({
    id: sentence.id,
    text: sentence.text,
    snippetTexts: sentence.snippets.map((snippet) => snippet.content),
  }));
}

/**
 * 共有データを表示用構造に変換する
 * @param matrix 文×スニペット配列
 * @return 表示用構造
 */
function createDisplaySentencesFromMatrix(matrix: string[][]): DisplaySentence[] {
  return matrix.map((snippetTexts, index) => ({
    id: `shared-${index}`,
    text: snippetTexts.join(''),
    snippetTexts,
  }));
}

/**
 * 現在のURLに共有用ハッシュを反映して共有URLを返す
 * @param sentences 表示用の完成文
 * @return 更新後のURL（ブラウザ外ならnull）
 */
function persistShareHash(sentences: DisplaySentence[]): string | null {
  if (typeof window === 'undefined' || sentences.length === 0) {
    return null;
  }
  const matrix = sentences.map((sentence) => sentence.snippetTexts);
  const encoded = encodeSharedSentences(matrix);
  const url = new URL(window.location.href);
  url.hash = `${SHARE_HASH_PREFIX}${encoded}`;
  window.history.replaceState(null, '', url.toString());
  return url.toString();
}

/**
 * URLから共有用ハッシュを取り除く
 * @return 更新後のURL（ブラウザ外ならnull）
 */
function clearShareHash(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const url = new URL(window.location.href);
  url.hash = '';
  window.history.replaceState(null, '', url.toString());
  return url.toString();
}
