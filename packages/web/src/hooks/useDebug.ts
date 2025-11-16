import type { ExquisiteFishCorpseGame } from '@exquisite-fish-corpse/core';
import { useMemo } from 'react';

import type { GameDebugEntry } from '../components/GameDebugPanel';

export type UseDebugResult = {
  debugMode: boolean;
  debugSnippets: GameDebugEntry[] | null;
};

/**
 * デバッグモードの有効状態と可視化用スニペットを管理する
 * @param game コアゲームインスタンス
 * @param dependencies 再計算トリガーとして使う依存リスト
 * @return デバッグモードとスニペット情報
 */
export function useDebug(game: ExquisiteFishCorpseGame, dependencies: ReadonlyArray<unknown> = []): UseDebugResult {
  const debugMode = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('d') === 'true';
  }, []);

  const debugSnippets = useMemo<GameDebugEntry[] | null>(() => {
    if (!debugMode) {
      return null;
    }
    const serialized = game.serialize().snippets;
    return serialized.map((snippet) => {
      const previous = snippet.previousSnippetId ? game.getSnippetById(snippet.previousSnippetId) : null;
      const next = snippet.nextSnippetId ? game.getSnippetById(snippet.nextSnippetId) : null;
      return {
        id: snippet.id,
        position: snippet.position,
        content: snippet.content,
        previous: previous?.content ?? null,
        next: next?.content ?? null,
      };
    });
  }, [debugMode, game, ...dependencies]);

  return { debugMode, debugSnippets };
}
